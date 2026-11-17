import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { users, condominiums } from '@/lib/db/collections'
import { getStatus, getRole } from '@/lib/db/status-map'
import { signToken } from '@/lib/auth/jwt'
import { AUTH_COOKIE, COOKIE_OPTIONS } from '@/lib/auth/cookies'
import { checkRateLimit, clientIp } from '@/lib/auth/rateLimit'
import { emailSchema, passwordSchema, EMAIL_COLLATION } from '@/lib/auth/email'

const RegisterSchema = z.object({
  condoName: z.string().trim().min(3).max(120),
  name: z.string().trim().min(2).max(120),
  email: emailSchema,
  password: passwordSchema,
})

function toSlug(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function POST(request: Request) {
  try {
    // Rate limit: 5 cadastros por IP por hora
    const rl = await checkRateLimit(`register:${clientIp(request.headers)}`, 5, 60 * 60 * 1000)
    if (rl.blocked) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente mais tarde.' },
        { status: 429 },
      )
    }

    const body = await request.json()
    const parsed = RegisterSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 },
      )
    }

    const { condoName, name, email, password } = parsed.data

    const [{ _id: activeStatusId }, { _id: adminRoleId }] = await Promise.all([
      getStatus('active'),
      getRole('admin'),
    ])

    // Email único globalmente entre usuários ativos. O cadastro SEMPRE cria um condomínio
    // novo — nunca vincula a pessoa a um condomínio existente.
    const usersCol = await users()
    const existingUser = await usersCol.findOne(
      { email, status_id: activeStatusId },
      { collation: EMAIL_COLLATION },
    )
    if (existingUser) {
      return NextResponse.json({ error: 'Este email já está em uso.' }, { status: 409 })
    }

    // Gera slug único (adiciona sufixo numérico se já existir)
    const condosCol = await condominiums()
    const baseSlug = toSlug(condoName) || 'condominio'
    let slug = baseSlug
    let suffix = 2
    while (await condosCol.findOne({ slug })) {
      slug = `${baseSlug}-${suffix++}`
    }

    const now = new Date()

    // Cria condomínio
    const condoResult = await condosCol.insertOne({
      name: condoName,
      slug,
      status_id: activeStatusId,
      created_at: now,
    })

    // Cria usuário admin
    const password_hash = await bcrypt.hash(password, 12)
    let userId
    try {
      const userResult = await usersCol.insertOne({
        condo_id: condoResult.insertedId,
        name,
        email,
        password_hash,
        role_id: adminRoleId,
        status_id: activeStatusId,
        created_at: now,
      })
      userId = userResult.insertedId
    } catch (err) {
      // Corrida com outro cadastro do mesmo email (índice único) — desfaz o condomínio
      await condosCol.deleteOne({ _id: condoResult.insertedId })
      if ((err as { code?: number }).code === 11000) {
        return NextResponse.json({ error: 'Este email já está em uso.' }, { status: 409 })
      }
      throw err
    }

    // Login automático
    const token = await signToken({
      sub: userId.toString(),
      name,
      role: 'admin',
      condo_id: condoResult.insertedId.toString(),
      condo_name: condoName,
    })

    const response = NextResponse.json({ ok: true }, { status: 201 })
    response.cookies.set(AUTH_COOKIE, token, COOKIE_OPTIONS)
    return response
  } catch (err) {
    console.error('[POST /api/register]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
