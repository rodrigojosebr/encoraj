import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { users, roles, condominiums } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { signToken } from '@/lib/auth/jwt'
import { AUTH_COOKIE, COOKIE_OPTIONS } from '@/lib/auth/cookies'

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = LoginSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    const { email, password } = parsed.data
    const col = await users()
    const { _id: activeStatusId } = await getStatus('active')
    const user = await col.findOne({ email, status_id: activeStatusId })

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return NextResponse.json({ error: 'Email ou senha incorretos' }, { status: 401 })
    }

    if (!user.condo_id) {
      return NextResponse.json({ error: 'Usuário sem condomínio vinculado. Execute yarn seed.' }, { status: 403 })
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

    const token = await signToken({
      sub: user._id!.toString(),
      name: user.name,
      role: roleDoc.name,
      condo_id: user.condo_id.toString(),
      condo_name: condo.name,
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
