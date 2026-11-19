import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { residents } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { getSession } from '@/lib/auth/session'
import { logAction } from '@/lib/audit/log'
import { reportError } from '@/lib/observability/report'
import { can } from '@/lib/auth/permissions'

const UpdateResidentSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  apartment: z.string().trim().min(1).max(20).optional(),
  bloco: z.string().trim().max(20).optional(),
  whatsapp: z.string().trim().min(8).max(20).optional(),
})

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const { userId: actorId, userName: actorName, condoId } = session

    if (!can(session, 'residents.write')) {
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

    await col.updateOne({ _id: new ObjectId(id), condo_id: new ObjectId(condoId) }, { $set: updateFields })

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
    await reportError('[PUT /api/residents/[id]]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const { userId: actorId, userName: actorName, condoId } = session

    if (!can(session, 'residents.write')) {
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
      { _id: new ObjectId(id), condo_id: new ObjectId(condoId) },
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
    await reportError('[PATCH /api/residents/[id]]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const { userId: actorId, userName: actorName, condoId } = session

    if (!can(session, 'residents.write')) {
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
      { _id: new ObjectId(id), condo_id: new ObjectId(condoId) },
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
    await reportError('[DELETE /api/residents/[id]]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
