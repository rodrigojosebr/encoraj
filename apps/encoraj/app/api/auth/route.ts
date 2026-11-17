import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { users, roles, condominiums } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { signToken } from '@/lib/auth/jwt'
import { AUTH_COOKIE, COOKIE_OPTIONS } from '@/lib/auth/cookies'
import { checkRateLimit, isRateLimited, clearRateLimit, clientIp } from '@/lib/auth/rateLimit'
import { EMAIL_COLLATION } from '@/lib/auth/email'

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
})

const WINDOW_MS = 15 * 60 * 1000
const MAX_PER_ACCOUNT = 5 // falhas por IP + email
const MAX_PER_IP = 50 // falhas por IP (portaria inteira atrás do mesmo IP)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = LoginSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    const { email, password } = parsed.data

    // Rate limit conta só falhas: login certo não consome tentativa
    const ip = clientIp(request.headers)
    const accountKey = `login:${ip}:${email}`
    const ipKey = `login-ip:${ip}`
    if ((await isRateLimited(accountKey, MAX_PER_ACCOUNT)) || (await isRateLimited(ipKey, MAX_PER_IP))) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
        { status: 429 },
      )
    }

    const col = await users()
    const { _id: activeStatusId } = await getStatus('active')

    // Só contas ATIVAS entram. Se dados antigos tiverem o mesmo email ativo em mais de
    // um condomínio, vale a conta mais recente cuja senha confere — nunca "a primeira
    // que o banco devolver".
    const candidates = await col
      .find({ email, status_id: activeStatusId }, { collation: EMAIL_COLLATION })
      .sort({ created_at: -1 })
      .toArray()

    let user = null
    for (const candidate of candidates) {
      if (await bcrypt.compare(password, candidate.password_hash)) {
        user = candidate
        break
      }
    }

    if (!user) {
      await Promise.all([
        checkRateLimit(accountKey, MAX_PER_ACCOUNT, WINDOW_MS),
        checkRateLimit(ipKey, MAX_PER_IP, WINDOW_MS),
      ])
      return NextResponse.json({ error: 'Email ou senha incorretos' }, { status: 401 })
    }

    if (!user.condo_id) {
      return NextResponse.json({ error: 'Usuário sem condomínio vinculado.' }, { status: 403 })
    }

    const rolesCol = await roles()
    const roleDoc = await rolesCol.findOne({ _id: user.role_id })
    if (!roleDoc) {
      return NextResponse.json({ error: 'Role do usuário não encontrada.' }, { status: 500 })
    }

    const condosCol = await condominiums()
    const condo = await condosCol.findOne({ _id: user.condo_id })
    if (!condo) {
      return NextResponse.json({ error: 'Condomínio não encontrado.' }, { status: 500 })
    }

    await clearRateLimit(accountKey)

    const token = await signToken({
      sub: user._id!.toString(),
      name: user.name,
      role: roleDoc.name,
      condo_id: user.condo_id.toString(),
      condo_name: condo.name,
      ...(user.photo_url ? { photo_url: user.photo_url } : {}),
      ...(condo.photo_url ? { condo_photo_url: condo.photo_url } : {}),
    })

    const response = NextResponse.json({ ok: true })
    response.cookies.set(AUTH_COOKIE, token, COOKIE_OPTIONS)
    return response
  } catch (err) {
    console.error('[POST /api/auth]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(AUTH_COOKIE, '', { ...COOKIE_OPTIONS, maxAge: 0 })
  return response
}
