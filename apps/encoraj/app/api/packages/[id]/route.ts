import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { packages } from '@/lib/db/collections'
import { getSession } from '@/lib/auth/session'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (!['admin', 'porteiro', 'sindico'].includes(session.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const col = await packages()
    const doc = await col.findOne(
      { _id: new ObjectId(id), condo_id: new ObjectId(session.condoId) },
      { projection: { delivery_pin: 0, public_token: 0 } },
    )

    if (!doc) {
      return NextResponse.json({ error: 'Encomenda não encontrada' }, { status: 404 })
    }

    return NextResponse.json(doc)
  } catch (err) {
    console.error('[GET /api/packages/[id]]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
