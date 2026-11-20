import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { users, condominiums } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { clearSessionCookie, setSessionCookie } from '@/lib/auth/cookies'
import { checkRateLimit, isRateLimited, clearRateLimit, clientIp } from '@/lib/auth/rateLimit'
import { userRoleNames } from '@/lib/auth/user-roles'
import { emailSchema } from '@/lib/auth/email'
import { parseBody, serverError, tooManyRequests } from '@/lib/api/http'

const LoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
})

const WINDOW_MS = 15 * 60 * 1000
const MAX_PER_ACCOUNT = 5 // falhas por IP + email
const MAX_PER_IP = 50 // falhas por IP (portaria inteira atrás do mesmo IP)

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseBody(request, LoginSchema)
    if (parsed.error) return parsed.error

    const { email, password } = parsed.data

    // Rate limit conta só falhas: login certo não consome tentativa
    const ip = clientIp(request.headers)
    const accountKey = `login:${ip}:${email}`
    const ipKey = `login-ip:${ip}`
    if ((await isRateLimited(accountKey, MAX_PER_ACCOUNT)) || (await isRateLimited(ipKey, MAX_PER_IP))) {
      return tooManyRequests()
    }

    const col = await users()
    const { _id: activeStatusId } = await getStatus('active')

    // Só conta ATIVA entra. Email é único entre os ativos (índice no banco), então há
    // no máximo uma: quem saiu de um condomínio e entrou em outro cai sempre no atual.
    const found = await col.findOne({ email, status_id: activeStatusId })
    const user = found && (await bcrypt.compare(password, found.password_hash)) ? found : null

    if (!user) {
      await Promise.all([
        checkRateLimit(accountKey, MAX_PER_ACCOUNT, WINDOW_MS),
        checkRateLimit(ipKey, MAX_PER_IP, WINDOW_MS),
      ])
      return NextResponse.json({ error: 'Email ou senha incorretos.' }, { status: 401 })
    }

    if (!user.condo_id) {
      return NextResponse.json({ error: 'Usuário sem condomínio vinculado.' }, { status: 403 })
    }

    const roleNames = await userRoleNames(user)
    if (roleNames.length === 0) {
      return NextResponse.json({ error: 'Role do usuário não encontrada.' }, { status: 500 })
    }

    const condosCol = await condominiums()
    const condo = await condosCol.findOne({ _id: user.condo_id })
    if (!condo) {
      return NextResponse.json({ error: 'Condomínio não encontrado.' }, { status: 500 })
    }

    await clearRateLimit(accountKey)

    const response = NextResponse.json({ ok: true })
    await setSessionCookie(response, {
      userId: user._id!.toString(),
      userName: user.name,
      roles: roleNames,
      condoId: user.condo_id.toString(),
      condoName: condo.name,
    })
    return response
  } catch (err) {
    return serverError('[POST /api/auth]', err)
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  clearSessionCookie(response)
  return response
}
