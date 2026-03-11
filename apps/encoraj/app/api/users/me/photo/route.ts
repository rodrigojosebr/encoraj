import { NextResponse } from 'next/server'
import { headers, cookies } from 'next/headers'
import { ObjectId } from 'mongodb'
import { users } from '@/lib/db/collections'
import { uploadToS3 } from '@/lib/s3/upload'
import { signToken, verifyToken } from '@/lib/auth/jwt'
import { AUTH_COOKIE, COOKIE_OPTIONS } from '@/lib/auth/cookies'
import { logAction } from '@/lib/audit/log'

export async function POST(request: Request) {
  try {
    const headersList = await headers()
    const userId = headersList.get('x-user-id')
    const userName = headersList.get('x-user-name')
    const condoId = headersList.get('x-condo-id')

    if (!userId || !userName || !condoId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Formato inválido. Use JPEG, PNG ou WebP.' }, { status: 400 })
    }

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const key = `condos/${condoId}/users/${userId}/avatar.${ext}`
    const bytes = await file.arrayBuffer()
    const photo_url = await uploadToS3(Buffer.from(bytes), key, file.type)

    const col = await users()
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
    const response = NextResponse.json({ photo_url })

    if (currentToken) {
      try {
        const payload = await verifyToken(currentToken)
        const newToken = await signToken({ ...payload, photo_url })
        response.cookies.set(AUTH_COOKIE, newToken, COOKIE_OPTIONS)
      } catch { /* token inválido */ }
    }

    return response
  } catch (err) {
    console.error('[POST /api/users/me/photo]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
