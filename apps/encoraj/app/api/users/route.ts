import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { users } from '@/lib/db/collections'
import { getStatus, getRole } from '@/lib/db/status-map'
import { logAction } from '@/lib/audit/log'
import { getSession } from '@/lib/auth/session'
import { emailSchema, passwordSchema, EMAIL_COLLATION } from '@/lib/auth/email'

const ALLOWED_ROLES = ['admin', 'zelador', 'porteiro', 'sindico'] as const

const CreateUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(ALLOWED_ROLES),
})

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (session.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

    const col = await users()
    const docs = await col
      .find(
        { condo_id: new ObjectId(session.condoId), status_id: (await getStatus('active'))._id },
        { projection: { password_hash: 0, password_changed_at: 0 } },
      )
      .sort({ name: 1 })
      .toArray()

    return NextResponse.json(docs)
  } catch (err) {
    console.error('[GET /api/users]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (session.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

    const body = await request.json()
    const parsed = CreateUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const col = await users()
    const [{ _id: activeStatusId }, { _id: roleId }] = await Promise.all([
      getStatus('active'),
      getRole(parsed.data.role),
    ])

    // Email único entre usuários ativos de TODOS os condomínios: quem ainda está ativo
    // em outro condomínio precisa ser desativado lá antes de ser cadastrado aqui.
    const existing = await col.findOne(
      { email: parsed.data.email, status_id: activeStatusId },
      { collation: EMAIL_COLLATION },
    )
    if (existing) {
      return NextResponse.json({ error: 'Este email já está em uso.' }, { status: 409 })
    }

    const password_hash = await bcrypt.hash(parsed.data.password, 10)
    const now = new Date()
    const doc = {
      condo_id: new ObjectId(session.condoId),
      name: parsed.data.name,
      email: parsed.data.email,
      password_hash,
      role_id: roleId,
      status_id: activeStatusId,
      created_at: now,
    }

    let insertedId
    try {
      insertedId = (await col.insertOne(doc)).insertedId
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        return NextResponse.json({ error: 'Este email já está em uso.' }, { status: 409 })
      }
      throw err
    }

    await logAction({
      condo_id: new ObjectId(session.condoId),
      entity: 'users',
      entity_id: insertedId,
      action: 'created',
      actor_id: new ObjectId(session.userId),
      actor_name: session.userName,
      after: { name: doc.name, email: doc.email, role: parsed.data.role },
    })

    return NextResponse.json({ _id: insertedId }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/users]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
