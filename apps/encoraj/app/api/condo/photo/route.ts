import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { condominiums } from '@/lib/db/collections'
import { uploadToS3 } from '@/lib/s3/upload'
import { readImageUpload } from '@/lib/upload/image'
import { getSession } from '@/lib/auth/session'
import { logAction } from '@/lib/audit/log'
import { signS3Url } from '@/lib/s3/sign'
import { can } from '@/lib/auth/permissions'
import { badRequest, forbidden, serverError, unauthorized } from '@/lib/api/http'

export async function DELETE() {
  try {
    const session = await getSession()
    if (!session) {
      return unauthorized()
    }
    const { userId, userName, condoId } = session
    if (!can(session, 'condo.manage')) {
      return forbidden()
    }

    const col = await condominiums()
    await col.updateOne({ _id: new ObjectId(condoId) }, { $unset: { photo_url: '' } })

    await logAction({
      condo_id: new ObjectId(condoId),
      entity: 'condominiums',
      entity_id: new ObjectId(condoId),
      action: 'updated',
      actor_id: new ObjectId(userId),
      actor_name: userName,
      after: { photo_url: null },
    })

    return NextResponse.json({ photo_url: null })
  } catch (err) {
    return serverError('[DELETE /api/condo/photo]', err)
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return unauthorized()
    }
    const { userId, userName, condoId } = session
    if (!can(session, 'condo.manage')) {
      return forbidden()
    }

    const image = await readImageUpload(request)
    if ('error' in image) return badRequest(image.error)

    const key = `condos/${condoId}/logo.${image.ext}`
    const photo_url = await uploadToS3(image.buffer, key, image.contentType)

    const col = await condominiums()
    await col.updateOne({ _id: new ObjectId(condoId) }, { $set: { photo_url } })

    await logAction({
      condo_id: new ObjectId(condoId),
      entity: 'condominiums',
      entity_id: new ObjectId(condoId),
      action: 'updated',
      actor_id: new ObjectId(userId),
      actor_name: userName,
      after: { photo_url },
    })

    // No banco fica a URL canônica; para o navegador vai o link assinado
    return NextResponse.json({ photo_url: await signS3Url(photo_url) })
  } catch (err) {
    return serverError('[POST /api/condo/photo]', err)
  }
}
