import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { users } from '@/lib/db/collections'
import { uploadToS3 } from '@/lib/s3/upload'
import { readImageUpload } from '@/lib/upload/image'
import { getSession } from '@/lib/auth/session'
import { logAction } from '@/lib/audit/log'
import { signS3Url } from '@/lib/s3/sign'
import { badRequest, serverError, unauthorized } from '@/lib/api/http'

export async function DELETE() {
  try {
    const session = await getSession()
    if (!session) {
      return unauthorized()
    }
    const { userId, userName, condoId } = session

    const col = await users()
    await col.updateOne({ _id: new ObjectId(userId) }, { $unset: { photo_url: '' } })

    await logAction({
      condo_id: new ObjectId(condoId),
      entity: 'users',
      entity_id: new ObjectId(userId),
      action: 'updated',
      actor_id: new ObjectId(userId),
      actor_name: userName,
      after: { photo_url: null },
    })

    return NextResponse.json({ photo_url: null })
  } catch (err) {
    return serverError('[DELETE /api/users/me/photo]', err)
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return unauthorized()
    }
    const { userId, userName, condoId } = session

    const image = await readImageUpload(request)
    if ('error' in image) return badRequest(image.error)

    const col = await users()
    // Pasta do condomínio do próprio usuário: o super admin pode estar "dentro" de outro,
    // e a foto dele não pode sumir se aquele condomínio for apagado
    const me = await col.findOne({ _id: new ObjectId(userId) }, { projection: { condo_id: 1 } })
    const key = `condos/${me?.condo_id.toString() ?? condoId}/users/${userId}/avatar.${image.ext}`
    const photo_url = await uploadToS3(image.buffer, key, image.contentType)

    await col.updateOne({ _id: new ObjectId(userId) }, { $set: { photo_url } })

    await logAction({
      condo_id: new ObjectId(condoId),
      entity: 'users',
      entity_id: new ObjectId(userId),
      action: 'updated',
      actor_id: new ObjectId(userId),
      actor_name: userName,
      after: { photo_url },
    })

    // No banco fica a URL canônica; para o navegador vai o link assinado
    return NextResponse.json({ photo_url: await signS3Url(photo_url) })
  } catch (err) {
    return serverError('[POST /api/users/me/photo]', err)
  }
}
