import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { headers, cookies } from 'next/headers'
import { condominiums } from '@/lib/db/collections'
import { signToken, verifyToken } from '@/lib/auth/jwt'
import { AUTH_COOKIE, COOKIE_OPTIONS } from '@/lib/auth/cookies'
import { logAction } from '@/lib/audit/log'

const UpdateCondoSchema = z.object({
  name: z.string().min(2),
})

export async function GET() {
  try {
    const headersList = await headers()
    const condoId = headersList.get('x-condo-id')

    if (!condoId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const col = await condominiums()
    const condo = await col.findOne({ _id: new ObjectId(condoId) })
    if (!condo) return NextResponse.json({ error: 'Condomínio não encontrado' }, { status: 404 })

    return NextResponse.json({ name: condo.name, slug: condo.slug, photo_url: condo.photo_url ?? null })
  } catch (err) {
    console.error('[GET /api/condo]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const headersList = await headers()
    const role = headersList.get('x-user-role')
    const actorId = headersList.get('x-user-id')
    const actorName = headersList.get('x-user-name')
    const condoId = headersList.get('x-condo-id')

    if (!role || !actorId || !actorName || !condoId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = UpdateCondoSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const col = await condominiums()
    const before = await col.findOne({ _id: new ObjectId(condoId) })
    if (!before) return NextResponse.json({ error: 'Condomínio não encontrado' }, { status: 404 })

    await col.updateOne({ _id: new ObjectId(condoId) }, { $set: { name: parsed.data.name } })

    await logAction({
      condo_id: new ObjectId(condoId),
      entity: 'users', // audit_logs entity is typed — using 'users' as closest fit for settings
      entity_id: new ObjectId(condoId),
      action: 'updated',
      actor_id: new ObjectId(actorId),
      actor_name: actorName,
      before: { name: before.name },
      after: { name: parsed.data.name },
    })

    // Re-sign JWT with new condo_name so sidebar updates immediately
    const cookieStore = await cookies()
    const currentToken = cookieStore.get(AUTH_COOKIE)?.value
    const response = NextResponse.json({ ok: true })

    if (currentToken) {
      try {
        const payload = await verifyToken(currentToken)
        const newToken = await signToken({ ...payload, condo_name: parsed.data.name })
        response.cookies.set(AUTH_COOKIE, newToken, COOKIE_OPTIONS)
      } catch {
        // Token inválido — não atualiza, usuário fará login novamente
      }
    }

    return response
  } catch (err) {
    console.error('[PUT /api/condo]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
