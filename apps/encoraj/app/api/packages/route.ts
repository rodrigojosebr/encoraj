import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { headers } from 'next/headers'
import { packages } from '@/lib/db/collections'
import { getStatusId } from '@/lib/db/status-map'

export async function GET(request: Request) {
  try {
    const headersList = await headers()
    const condoId = headersList.get('x-condo-id')

    if (!condoId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const filter: Record<string, unknown> = { condo_id: new ObjectId(condoId) }
    if (status) filter.status_id = await getStatusId(status)

    const col = await packages()
    const docs = await col.find(filter).sort({ arrived_at: -1 }).toArray()

    return NextResponse.json(docs)
  } catch (err) {
    console.error('[GET /api/packages]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
