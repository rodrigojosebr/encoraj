import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { headers } from 'next/headers'
import { packages } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteContext) {
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

    const body = await request.json().catch(() => ({}))
    const pin: string | undefined = typeof body?.pin === 'string' ? body.pin.trim() : undefined

    const col = await packages()
    const doc = await col.findOne({ _id: new ObjectId(id), condo_id: new ObjectId(condoId) })

    if (!doc) {
      return NextResponse.json({ error: 'Encomenda não encontrada' }, { status: 404 })
    }

    const { _id: deliveredStatusId } = await getStatus('delivered')
    if (doc.status_id.equals(deliveredStatusId)) {
      return NextResponse.json({ error: 'Encomenda já foi entregue' }, { status: 409 })
    }

    // Valida PIN apenas se a encomenda tem delivery_pin cadastrado (pacotes legados não têm)
    if (doc.delivery_pin) {
      if (!pin) {
        return NextResponse.json({ error: 'Código de retirada obrigatório.' }, { status: 400 })
      }
      if (pin !== doc.delivery_pin) {
        return NextResponse.json({ error: 'Código de retirada incorreto.' }, { status: 400 })
      }
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
