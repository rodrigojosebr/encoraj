import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ObjectId } from 'mongodb'
import { condominiums } from '@/lib/db/collections'
import { uploadToS3 } from '@/lib/s3/upload'
import { signToken, verifyToken } from '@/lib/auth/jwt'
import { AUTH_COOKIE, COOKIE_OPTIONS } from '@/lib/auth/cookies'
import { readImageUpload } from '@/lib/upload/image'
import { getSession } from '@/lib/auth/session'
import { logAction } from '@/lib/audit/log'
import { signS3Url } from '@/lib/s3/sign'

export async function DELETE() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const { role, userId, userName, condoId } = session
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
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

    const cookieStore = await cookies()
    const currentToken = cookieStore.get(AUTH_COOKIE)?.value
    const response = NextResponse.json({ photo_url: null })

    if (currentToken) {
      try {
        const payload = await verifyToken(currentToken)
        const { condo_photo_url: _removed, ...rest } = payload
        void _removed
        const newToken = await signToken(rest)
        response.cookies.set(AUTH_COOKIE, newToken, COOKIE_OPTIONS)
      } catch { /* token inválido */ }
    }

    return response
  } catch (err) {
    console.error('[DELETE /api/condo/photo]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const { role, userId, userName, condoId } = session
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const image = await readImageUpload(request)
    if ('error' in image) return NextResponse.json({ error: image.error }, { status: 400 })

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

    // Re-assina JWT com condo_photo_url atualizado
    const cookieStore = await cookies()
    const currentToken = cookieStore.get(AUTH_COOKIE)?.value
    // No banco e no JWT fica a URL canônica; para o navegador vai o link assinado
    const response = NextResponse.json({ photo_url: await signS3Url(photo_url) })

    if (currentToken) {
      try {
        const payload = await verifyToken(currentToken)
        const newToken = await signToken({ ...payload, condo_photo_url: photo_url })
        response.cookies.set(AUTH_COOKIE, newToken, COOKIE_OPTIONS)
      } catch { /* token inválido */ }
    }

    return response
  } catch (err) {
    console.error('[POST /api/condo/photo]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
