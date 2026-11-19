import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { packages } from '@/lib/db/collections'
import { getSession } from '@/lib/auth/session'
import { signS3Url } from '@/lib/s3/sign'
import { reportError } from '@/lib/observability/report'
import { can } from '@/lib/auth/permissions'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (!can(session, 'packages.read')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const col = await packages()
    const doc = await col.findOne(
      { _id: new ObjectId(id), condo_id: new ObjectId(session.condoId) },
      { projection: { delivery_pin: 0, public_token: 0 } },
    )

    if (!doc) {
      return NextResponse.json({ error: 'Encomenda não encontrada' }, { status: 404 })
    }

    // URL de imagem só sai assinada
    return NextResponse.json({
      ...doc,
      photo_url: await signS3Url(doc.photo_url),
      qrcode_url: await signS3Url(doc.qrcode_url),
    })
  } catch (err) {
    await reportError('[GET /api/packages/[id]]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
