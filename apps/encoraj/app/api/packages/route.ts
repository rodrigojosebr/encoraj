import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { randomBytes, randomInt } from 'crypto'
import { z } from 'zod'
import { packages, residents } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { logAction } from '@/lib/audit/log'
import { generateAndUploadQRCode } from '@/lib/qrcode/generate'
import { getSession } from '@/lib/auth/session'
import { s3PublicUrl } from '@/lib/s3/upload'
import { signS3Url } from '@/lib/s3/sign'
import { reportError } from '@/lib/observability/report'
import { can } from '@/lib/auth/permissions'

const createSchema = z.object({
  resident_id: z.string().refine((v) => ObjectId.isValid(v), 'Morador inválido'),
  photo_url: z.string().url(),
  notes: z.string().trim().max(500).optional(),
})

const PACKAGE_STATUSES = ['arrived', 'notified', 'delivered']

// PIN e token do link público nunca saem pela API de listagem/detalhe
const SAFE_PROJECTION = { delivery_pin: 0, public_token: 0 }

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (!can(session, 'packages.read')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const filter: Record<string, unknown> = { condo_id: new ObjectId(session.condoId) }
    if (status) {
      if (!PACKAGE_STATUSES.includes(status)) {
        return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
      }
      filter.status_id = (await getStatus(status))._id
    }

    const col = await packages()
    const docs = await col
      .find(filter, { projection: SAFE_PROJECTION })
      .sort({ arrived_at: -1 })
      .limit(500)
      .toArray()

    // URL de imagem só sai assinada
    const signed = await Promise.all(
      docs.map(async (doc) => ({
        ...doc,
        photo_url: await signS3Url(doc.photo_url),
        qrcode_url: await signS3Url(doc.qrcode_url),
      })),
    )
    return NextResponse.json(signed)
  } catch (err) {
    await reportError('[GET /api/packages]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (!can(session, 'packages.register')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }
    const { resident_id, photo_url, notes } = parsed.data
    const condoOid = new ObjectId(session.condoId)

    // A foto tem que ser a que /api/upload gravou para ESTE condomínio
    if (!photo_url.startsWith(s3PublicUrl(`condos/${session.condoId}/packages/photos/`))) {
      return NextResponse.json({ error: 'Foto inválida' }, { status: 400 })
    }

    // Morador ativo e do mesmo condomínio
    const resCol = await residents()
    const resident = await resCol.findOne({
      _id: new ObjectId(resident_id),
      condo_id: condoOid,
      status_id: (await getStatus('active'))._id,
    })
    if (!resident) {
      return NextResponse.json({ error: 'Morador não encontrado' }, { status: 404 })
    }

    const arrivedStatus = await getStatus('arrived')
    const packageId = new ObjectId()

    // Código de exibição, PIN de retirada, token do link público e QR code
    const code = `PKG-${packageId.toString().slice(-6).toUpperCase()}`
    const delivery_pin = String(randomInt(100000, 1000000))
    const public_token = randomBytes(18).toString('base64url')
    const qrcode_url = await generateAndUploadQRCode(packageId.toString(), session.condoId)

    const now = new Date()
    const doc = {
      _id: packageId,
      condo_id: condoOid,
      resident_id: new ObjectId(resident_id),
      code,
      delivery_pin,
      public_token,
      qrcode_url,
      photo_url,
      status_id: arrivedStatus._id,
      arrived_at: now,
      arrived_by: new ObjectId(session.userId),
      notes: notes || undefined,
      created_at: now,
    }

    const col = await packages()
    await col.insertOne(doc)

    await logAction({
      condo_id: condoOid,
      entity: 'packages',
      entity_id: packageId,
      action: 'created',
      actor_id: new ObjectId(session.userId),
      actor_name: session.userName,
      after: { resident_id, code, photo_url, notes },
    })

    return NextResponse.json({ _id: packageId, code, qrcode_url: await signS3Url(qrcode_url) }, { status: 201 })
  } catch (err) {
    await reportError('[POST /api/packages]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
