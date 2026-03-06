import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { headers } from 'next/headers'
import bcrypt from 'bcryptjs'
import { users } from '@/lib/db/collections'
import { getStatus, getRole } from '@/lib/db/status-map'
import { logAction } from '@/lib/audit/log'

const ALLOWED_ROLES = ['admin', 'zelador', 'porteiro', 'sindico'] as const

const UpdateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(ALLOWED_ROLES).optional(),
})

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
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
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const body = await request.json()
    const parsed = UpdateUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const col = await users()
    const before = await col.findOne({ _id: new ObjectId(id), condo_id: new ObjectId(condoId) })
    if (!before) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Check email uniqueness if changing email
    if (parsed.data.email && parsed.data.email !== before.email) {
      const conflict = await col.findOne({
        email: parsed.data.email,
        condo_id: new ObjectId(condoId),
        _id: { $ne: new ObjectId(id) },
      })
      if (conflict) {
        return NextResponse.json({ error: 'E-mail já cadastrado neste condomínio' }, { status: 409 })
      }
    }

    const updateFields: Record<string, unknown> = { updated_at: new Date() }

    if (parsed.data.name) updateFields.name = parsed.data.name
    if (parsed.data.email) updateFields.email = parsed.data.email
    if (parsed.data.password) updateFields.password_hash = await bcrypt.hash(parsed.data.password, 10)
    if (parsed.data.role) updateFields.role_id = (await getRole(parsed.data.role))._id

    await col.updateOne({ _id: new ObjectId(id) }, { $set: updateFields })

    await logAction({
      condo_id: new ObjectId(condoId),
      entity: 'users',
      entity_id: new ObjectId(id),
      action: 'updated',
      actor_id: new ObjectId(actorId),
      actor_name: actorName,
      before: { name: before.name, email: before.email },
      after: { name: parsed.data.name, email: parsed.data.email, role: parsed.data.role },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PUT /api/users/[id]]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
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
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }
    // Prevent self-deletion
    if (id === actorId) {
      return NextResponse.json({ error: 'Você não pode desativar sua própria conta' }, { status: 400 })
    }

    const col = await users()
    const [{ _id: activeStatusId }, { _id: deletedStatusId }] = await Promise.all([
      getStatus('active'),
      getStatus('deleted'),
    ])
    const doc = await col.findOne({ _id: new ObjectId(id), condo_id: new ObjectId(condoId), status_id: activeStatusId })
    if (!doc) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const now = new Date()
    await col.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status_id: deletedStatusId, deleted_at: now, deleted_by: new ObjectId(actorId) } },
    )

    await logAction({
      condo_id: new ObjectId(condoId),
      entity: 'users',
      entity_id: new ObjectId(id),
      action: 'deleted',
      actor_id: new ObjectId(actorId),
      actor_name: actorName,
      before: { name: doc.name, email: doc.email },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/users/[id]]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
