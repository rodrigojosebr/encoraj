import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { headers } from 'next/headers'
import { packages } from '@/lib/db/collections'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const headersList = await headers()
    const condoId = headersList.get('x-condo-id')

    if (!condoId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const col = await packages()
    const doc = await col.findOne({ _id: new ObjectId(id), condo_id: new ObjectId(condoId) })

    if (!doc) {
      return NextResponse.json({ error: 'Encomenda não encontrada' }, { status: 404 })
    }

    return NextResponse.json(doc)
  } catch (err) {
    console.error('[GET /api/packages/[id]]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
