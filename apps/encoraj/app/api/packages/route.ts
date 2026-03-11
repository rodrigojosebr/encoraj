import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { headers } from 'next/headers'
import { z } from 'zod'
import { packages, residents } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { logAction } from '@/lib/audit/log'
import { generateAndUploadQRCode } from '@/lib/qrcode/generate'

const createSchema = z.object({
  resident_id: z.string().min(1),
  photo_url: z.string().url(),
  notes: z.string().optional(),
})

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
    if (status) filter.status_id = (await getStatus(status))._id

    const col = await packages()
    const docs = await col.find(filter).sort({ arrived_at: -1 }).toArray()

    return NextResponse.json(docs)
  } catch (err) {
    console.error('[GET /api/packages]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const headersList = await headers()
    const condoId = headersList.get('x-condo-id')
    const userId = headersList.get('x-user-id')
    const userName = headersList.get('x-user-name')
    const role = headersList.get('x-user-role')

    if (!condoId || !userId || !userName) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (role !== 'porteiro' && role !== 'admin') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }
    const { resident_id, photo_url, notes } = parsed.data

    // Valida morador pertence ao condo
    const resCol = await residents()
    const resident = await resCol.findOne({
      _id: new ObjectId(resident_id),
      condo_id: new ObjectId(condoId),
    })
    if (!resident) {
      return NextResponse.json({ error: 'Morador não encontrado' }, { status: 404 })
    }

    const arrivedStatus = await getStatus('arrived')
    const packageId = new ObjectId()

    // Gera código único e QR code
    const code = `PKG-${packageId.toString().slice(-6).toUpperCase()}`
    const qrcode_url = await generateAndUploadQRCode(packageId.toString(), condoId)

    const now = new Date()
    const doc = {
      _id: packageId,
      condo_id: new ObjectId(condoId),
      resident_id: new ObjectId(resident_id),
      code,
      qrcode_url,
      photo_url,
      status_id: arrivedStatus._id,
      arrived_at: now,
      arrived_by: new ObjectId(userId),
      notes: notes ?? undefined,
      created_at: now,
    }

    const col = await packages()
    await col.insertOne(doc)

    await logAction({
      condo_id: new ObjectId(condoId),
      entity: 'packages',
      entity_id: packageId,
      action: 'created',
      actor_id: new ObjectId(userId),
      actor_name: userName,
      after: { resident_id, code, photo_url, notes },
    })

    return NextResponse.json({ _id: packageId, code, qrcode_url }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/packages]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
