import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { users, roles, condominiums } from '@/lib/db/collections'
import { getStatus, getRole } from '@/lib/db/status-map'
import { signToken } from '@/lib/auth/jwt'
import { AUTH_COOKIE, COOKIE_OPTIONS } from '@/lib/auth/cookies'

const RegisterSchema = z.object({
  condoName: z.string().min(3),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
})

function toSlug(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = RegisterSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    const { condoName, name, email, password } = parsed.data

    const [{ _id: activeStatusId }, { _id: adminRoleId }] = await Promise.all([
      getStatus('active'),
      getRole('admin'),
    ])

    // Verifica email único
    const usersCol = await users()
    const existingUser = await usersCol.findOne({ email })
    if (existingUser) {
      return NextResponse.json({ error: 'Este email já está em uso' }, { status: 409 })
    }

    // Gera slug único (adiciona sufixo numérico se já existir)
    const condosCol = await condominiums()
    const baseSlug = toSlug(condoName)
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
    const userResult = await usersCol.insertOne({
      condo_id: condoResult.insertedId,
      name,
      email,
      password_hash,
      role_id: adminRoleId,
      status_id: activeStatusId,
      created_at: now,
    })

    // Login automático
    const token = await signToken({
      sub: userResult.insertedId.toString(),
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
