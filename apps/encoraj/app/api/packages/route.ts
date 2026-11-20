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
import { can } from '@/lib/auth/permissions'
import { badRequest, forbidden, notFound, parseBody, serverError, unauthorized } from '@/lib/api/http'

const createSchema = z.object({
  resident_id: z.string().refine((v) => ObjectId.isValid(v), 'Morador inválido.'),
  photo_url: z.string().url(),
  notes: z.string().trim().max(500).optional(),
})

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return unauthorized()
    if (!can(session, 'packages.register')) {
      return forbidden()
    }

    const parsed = await parseBody(request, createSchema)
    if (parsed.error) return parsed.error
    const { resident_id, photo_url, notes } = parsed.data
    const condoOid = new ObjectId(session.condoId)

    // A foto tem que ser a que /api/upload gravou para ESTE condomínio
    if (!photo_url.startsWith(s3PublicUrl(`condos/${session.condoId}/packages/photos/`))) {
      return badRequest('Foto inválida.')
    }

    // Morador ativo e do mesmo condomínio
    const resCol = await residents()
    const resident = await resCol.findOne({
      _id: new ObjectId(resident_id),
      condo_id: condoOid,
      status_id: (await getStatus('active'))._id,
    })
    if (!resident) {
      return notFound('Morador não encontrado.')
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
    return serverError('[POST /api/packages]', err)
  }
}
