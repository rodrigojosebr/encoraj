import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { headers } from 'next/headers'
import { packages } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const headersList = await headers()
    const role = headersList.get('x-user-role')
    const condoId = headersList.get('x-condo-id')

    if (!role || !condoId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (role !== 'admin' && role !== 'porteiro') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const col = await packages()
    const doc = await col.findOne({ _id: new ObjectId(id), condo_id: new ObjectId(condoId) })
    if (!doc) return NextResponse.json({ error: 'Encomenda não encontrada' }, { status: 404 })

    const [notified, delivered] = await Promise.all([
      getStatus('notified'),
      getStatus('delivered'),
    ])

    if (doc.status_id.equals(delivered._id)) {
      return NextResponse.json({ error: 'Encomenda já foi entregue' }, { status: 409 })
    }

    await col.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status_id: notified._id, notified_at: new Date() } },
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/packages/[id]/notify]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
