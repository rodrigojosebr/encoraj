import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { headers } from 'next/headers'
import bcrypt from 'bcryptjs'
import { users } from '@/lib/db/collections'
import { getStatus, getRole } from '@/lib/db/status-map'
import { logAction } from '@/lib/audit/log'

const ALLOWED_ROLES = ['admin', 'zelador', 'porteiro', 'sindico'] as const

const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(ALLOWED_ROLES),
})

export async function GET() {
  try {
    const headersList = await headers()
    const role = headersList.get('x-user-role')
    const condoId = headersList.get('x-condo-id')

    if (!condoId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

    const col = await users()
    const docs = await col
      .find({ condo_id: new ObjectId(condoId) })
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
    const headersList = await headers()
    const role = headersList.get('x-user-role')
    const actorId = headersList.get('x-user-id')
    const actorName = headersList.get('x-user-name')
    const condoId = headersList.get('x-condo-id')

    if (!role || !actorId || !actorName || !condoId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = CreateUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const col = await users()
    const existing = await col.findOne({ email: parsed.data.email, condo_id: new ObjectId(condoId) })
    if (existing) {
      return NextResponse.json({ error: 'E-mail já cadastrado neste condomínio' }, { status: 409 })
    }

    const [{ _id: activeStatusId }, { _id: roleId }] = await Promise.all([
      getStatus('active'),
      getRole(parsed.data.role),
    ])

    const password_hash = await bcrypt.hash(parsed.data.password, 10)
    const now = new Date()
    const doc = {
      condo_id: new ObjectId(condoId),
      name: parsed.data.name,
      email: parsed.data.email,
      password_hash,
      role_id: roleId,
      status_id: activeStatusId,
      created_at: now,
    }

    const result = await col.insertOne(doc)

    await logAction({
      condo_id: new ObjectId(condoId),
      entity: 'users',
      entity_id: result.insertedId,
      action: 'created',
      actor_id: new ObjectId(actorId),
      actor_name: actorName,
      after: { name: doc.name, email: doc.email, role: parsed.data.role },
    })

    return NextResponse.json({ _id: result.insertedId }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/users]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
