import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { uploadToS3 } from '@/lib/s3/upload'
import { getSession } from '@/lib/auth/session'
import { readImageUpload } from '@/lib/upload/image'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (session.role !== 'porteiro' && session.role !== 'admin') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const image = await readImageUpload(request)
    if ('error' in image) return NextResponse.json({ error: image.error }, { status: 400 })

    const key = `condos/${session.condoId}/packages/photos/${randomUUID()}.${image.ext}`
    const url = await uploadToS3(image.buffer, key, image.contentType)

    return NextResponse.json({ url })
  } catch (err) {
    console.error('[POST /api/upload]', err)
    return NextResponse.json({ error: 'Erro ao fazer upload' }, { status: 500 })
  }
}
