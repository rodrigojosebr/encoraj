import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { residents } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { getSession } from '@/lib/auth/session'
import { logAction } from '@/lib/audit/log'
import { can } from '@/lib/auth/permissions'
import { badRequest, forbidden, notFound, parseBody, serverError, unauthorized } from '@/lib/api/http'

const UpdateResidentSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  apartment: z.string().trim().min(1).max(20).optional(),
  block: z.string().trim().max(20).optional(),
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
      return unauthorized()
    }
    const { userId: actorId, userName: actorName, condoId } = session

    if (!can(session, 'residents.write')) {
      return forbidden()
    }

    if (!ObjectId.isValid(id)) {
      return badRequest('ID inválido.')
    }

    const parsed = await parseBody(request, UpdateResidentSchema)
    if (parsed.error) return parsed.error

    const col = await residents()
    const { _id: activeStatusId } = await getStatus('active')
    const before = await col.findOne({ _id: new ObjectId(id), condo_id: new ObjectId(condoId), status_id: activeStatusId })

    if (!before) {
      return notFound('Morador não encontrado.')
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
    return serverError('[PUT /api/residents/[id]]', err)
  }
}

export async function PATCH(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session) {
      return unauthorized()
    }
    const { userId: actorId, userName: actorName, condoId } = session

    if (!can(session, 'residents.write')) {
      return forbidden()
    }

    if (!ObjectId.isValid(id)) {
      return badRequest('ID inválido.')
    }

    const col = await residents()
    const [{ _id: deletedStatusId }, { _id: activeStatusId }] = await Promise.all([
      getStatus('deleted'),
      getStatus('active'),
    ])
    const doc = await col.findOne({ _id: new ObjectId(id), condo_id: new ObjectId(condoId), status_id: deletedStatusId })

    if (!doc) {
      return notFound('Morador não encontrado nos excluídos.')
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
    return serverError('[PATCH /api/residents/[id]]', err)
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session) {
      return unauthorized()
    }
    const { userId: actorId, userName: actorName, condoId } = session

    if (!can(session, 'residents.write')) {
      return forbidden()
    }

    if (!ObjectId.isValid(id)) {
      return badRequest('ID inválido.')
    }

    const col = await residents()
    const [{ _id: activeStatusId }, { _id: deletedStatusId }] = await Promise.all([
      getStatus('active'),
      getStatus('deleted'),
    ])
    const doc = await col.findOne({ _id: new ObjectId(id), condo_id: new ObjectId(condoId), status_id: activeStatusId })

    if (!doc) {
      return notFound('Morador não encontrado.')
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
    return serverError('[DELETE /api/residents/[id]]', err)
  }
}
