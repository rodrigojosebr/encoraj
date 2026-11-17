import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { packages } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { getSession } from '@/lib/auth/session'
import { logAction } from '@/lib/audit/log'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (session.role !== 'admin' && session.role !== 'porteiro') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const col = await packages()
    const pkgFilter = { _id: new ObjectId(id), condo_id: new ObjectId(session.condoId) }
    const doc = await col.findOne(pkgFilter)
    if (!doc) return NextResponse.json({ error: 'Encomenda não encontrada' }, { status: 404 })

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
      return NextResponse.json({ error: 'Encomenda já foi entregue' }, { status: 409 })
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
    console.error('[POST /api/packages/[id]/notify]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
