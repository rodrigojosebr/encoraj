import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ObjectId } from 'mongodb'
import { users } from '@/lib/db/collections'
import { uploadToS3 } from '@/lib/s3/upload'
import { signToken, verifyToken } from '@/lib/auth/jwt'
import { AUTH_COOKIE, COOKIE_OPTIONS } from '@/lib/auth/cookies'
import { readImageUpload } from '@/lib/upload/image'
import { getSession } from '@/lib/auth/session'
import { logAction } from '@/lib/audit/log'
import { signS3Url } from '@/lib/s3/sign'
import { reportError } from '@/lib/observability/report'

export async function DELETE() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
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

    const cookieStore = await cookies()
    const currentToken = cookieStore.get(AUTH_COOKIE)?.value
    const response = NextResponse.json({ photo_url: null })

    if (currentToken) {
      try {
        const payload = await verifyToken(currentToken)
        const { photo_url: _removed, ...rest } = payload
        void _removed
        const newToken = await signToken(rest)
        response.cookies.set(AUTH_COOKIE, newToken, COOKIE_OPTIONS)
      } catch { /* token inválido */ }
    }

    return response
  } catch (err) {
    await reportError('[DELETE /api/users/me/photo]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const { userId, userName, condoId } = session

    const image = await readImageUpload(request)
    if ('error' in image) return NextResponse.json({ error: image.error }, { status: 400 })

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

    // Re-assina JWT com photo_url atualizado
    const cookieStore = await cookies()
    const currentToken = cookieStore.get(AUTH_COOKIE)?.value
    // No banco e no JWT fica a URL canônica; para o navegador vai o link assinado
    const response = NextResponse.json({ photo_url: await signS3Url(photo_url) })

    if (currentToken) {
      try {
        const payload = await verifyToken(currentToken)
        const newToken = await signToken({ ...payload, photo_url })
        response.cookies.set(AUTH_COOKIE, newToken, COOKIE_OPTIONS)
      } catch { /* token inválido */ }
    }

    return response
  } catch (err) {
    await reportError('[POST /api/users/me/photo]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
