import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { headers } from 'next/headers'
import { packages } from '@/lib/db/collections'
import { getStatusId } from '@/lib/db/status-map'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const headersList = await headers()
    const role = headersList.get('x-user-role')
    const actorId = headersList.get('x-user-id')
    const condoId = headersList.get('x-condo-id')

    if (!role || !actorId || !condoId) {
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

    if (!doc) {
      return NextResponse.json({ error: 'Encomenda não encontrada' }, { status: 404 })
    }

    const deliveredStatusId = await getStatusId('delivered')
    if (doc.status_id.equals(deliveredStatusId)) {
      return NextResponse.json({ error: 'Encomenda já foi entregue' }, { status: 409 })
    }

    await col.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status_id: deliveredStatusId, delivered_at: new Date(), delivered_by: new ObjectId(actorId) } },
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/packages/[id]/deliver]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
