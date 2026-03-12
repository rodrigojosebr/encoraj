import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { headers } from 'next/headers'
import { residents } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { logAction } from '@/lib/audit/log'

const UpdateResidentSchema = z.object({
  name: z.string().min(2).optional(),
  apartment: z.string().min(1).optional(),
  bloco: z.string().optional(),
  whatsapp: z.string().min(1).optional(),
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

    if (role !== 'admin' && role !== 'zelador') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const body = await request.json()
    const parsed = UpdateResidentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const col = await residents()
    const { _id: activeStatusId } = await getStatus('active')
    const before = await col.findOne({ _id: new ObjectId(id), condo_id: new ObjectId(condoId), status_id: activeStatusId })

    if (!before) {
      return NextResponse.json({ error: 'Morador não encontrado' }, { status: 404 })
    }

    const updateFields = { ...parsed.data }

    await col.updateOne({ _id: new ObjectId(id) }, { $set: updateFields })

    await logAction({
      condo_id: new ObjectId(condoId),
      entity: 'residents',
      entity_id: new ObjectId(id),
      action: 'updated',
      actor_id: new ObjectId(actorId),
      actor_name: actorName,
      before: before as unknown as Record<string, unknown>,
      after: updateFields as Record<string, unknown>,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PUT /api/residents/[id]]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(_request: Request, { params }: RouteContext) {
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

    if (role !== 'admin' && role !== 'zelador') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const col = await residents()
    const [{ _id: deletedStatusId }, { _id: activeStatusId }] = await Promise.all([
      getStatus('deleted'),
      getStatus('active'),
    ])
    const doc = await col.findOne({ _id: new ObjectId(id), condo_id: new ObjectId(condoId), status_id: deletedStatusId })

    if (!doc) {
      return NextResponse.json({ error: 'Morador não encontrado nos excluídos' }, { status: 404 })
    }
    await col.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: { status_id: activeStatusId },
        $unset: { deleted_at: '', deleted_by: '' },
      },
    )

    await logAction({
      condo_id: new ObjectId(condoId),
      entity: 'residents',
      entity_id: new ObjectId(id),
      action: 'updated',
      actor_id: new ObjectId(actorId),
      actor_name: actorName,
      before: doc as unknown as Record<string, unknown>,
      after: { status_id: activeStatusId },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PATCH /api/residents/[id]]', err)
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

    if (role !== 'admin' && role !== 'zelador') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const col = await residents()
    const [{ _id: activeStatusId }, { _id: deletedStatusId }] = await Promise.all([
      getStatus('active'),
      getStatus('deleted'),
    ])
    const doc = await col.findOne({ _id: new ObjectId(id), condo_id: new ObjectId(condoId), status_id: activeStatusId })

    if (!doc) {
      return NextResponse.json({ error: 'Morador não encontrado' }, { status: 404 })
    }

    const now = new Date()
    await col.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status_id: deletedStatusId, deleted_at: now, deleted_by: new ObjectId(actorId) } },
    )

    await logAction({
      condo_id: new ObjectId(condoId),
      entity: 'residents',
      entity_id: new ObjectId(id),
      action: 'deleted',
      actor_id: new ObjectId(actorId),
      actor_name: actorName,
      before: doc as unknown as Record<string, unknown>,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/residents/[id]]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
