import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { uploadToS3 } from '@/lib/s3/upload'
import { getSession } from '@/lib/auth/session'
import { readImageUpload } from '@/lib/upload/image'
import { can } from '@/lib/auth/permissions'
import { badRequest, forbidden, serverError, unauthorized } from '@/lib/api/http'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return unauthorized()
    if (!can(session, 'packages.register')) {
      return forbidden()
    }

    const image = await readImageUpload(request)
    if ('error' in image) return badRequest(image.error)

    const key = `condos/${session.condoId}/packages/photos/${randomUUID()}.${image.ext}`
    const url = await uploadToS3(image.buffer, key, image.contentType)

    return NextResponse.json({ url })
  } catch (err) {
    return serverError('[POST /api/upload]', err)
  }
}
