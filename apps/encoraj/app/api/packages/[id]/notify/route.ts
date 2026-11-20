import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { packages } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { getSession } from '@/lib/auth/session'
import { logAction } from '@/lib/audit/log'
import { can } from '@/lib/auth/permissions'
import { badRequest, conflict, forbidden, notFound, serverError, unauthorized } from '@/lib/api/http'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session) return unauthorized()
    if (!can(session, 'packages.notify')) {
      return forbidden()
    }
    if (!ObjectId.isValid(id)) {
      return badRequest('ID inválido.')
    }

    const col = await packages()
    const pkgFilter = { _id: new ObjectId(id), condo_id: new ObjectId(session.condoId) }
    const doc = await col.findOne(pkgFilter)
    if (!doc) return notFound('Encomenda não encontrada.')

    const [notified, delivered] = await Promise.all([
      getStatus('notified'),
      getStatus('delivered'),
    ])

    // Atômico: uma notificação nunca "desentrega" uma encomenda já retirada
    const notifiedAt = new Date()
    const result = await col.updateOne(
      { ...pkgFilter, status_id: { $ne: delivered._id } },
      { $set: { status_id: notified._id, notified_at: notifiedAt } },
    )
    if (result.matchedCount === 0) {
      return conflict('Encomenda já foi entregue.')
    }

    await logAction({
      condo_id: new ObjectId(session.condoId),
      entity: 'packages',
      entity_id: new ObjectId(id),
      action: 'updated',
      actor_id: new ObjectId(session.userId),
      actor_name: session.userName,
      before: { status_id: doc.status_id },
      after: { status_id: notified._id, notified_at: notifiedAt },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return serverError('[POST /api/packages/[id]/notify]', err)
  }
}
