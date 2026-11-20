import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { condominiums } from '@/lib/db/collections'
import { setSessionCookie } from '@/lib/auth/cookies'
import { getSession } from '@/lib/auth/session'
import { logAction } from '@/lib/audit/log'
import { signS3Url } from '@/lib/s3/sign'
import { can } from '@/lib/auth/permissions'
import { forbidden, notFound, parseBody, serverError, unauthorized } from '@/lib/api/http'

const UpdateCondoSchema = z.object({
  name: z.string().trim().min(2).max(120),
})

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return unauthorized()
    const { condoId } = session

    const col = await condominiums()
    const condo = await col.findOne({ _id: new ObjectId(condoId) })
    if (!condo) return notFound('Condomínio não encontrado.')

    return NextResponse.json({ name: condo.name, slug: condo.slug, photo_url: await signS3Url(condo.photo_url) })
  } catch (err) {
    return serverError('[GET /api/condo]', err)
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return unauthorized()
    }
    const { userId: actorId, userName: actorName, condoId } = session
    if (!can(session, 'condo.manage')) {
      return forbidden()
    }

    const parsed = await parseBody(request, UpdateCondoSchema)
    if (parsed.error) return parsed.error

    const col = await condominiums()
    const before = await col.findOne({ _id: new ObjectId(condoId) })
    if (!before) return notFound('Condomínio não encontrado.')

    await col.updateOne({ _id: new ObjectId(condoId) }, { $set: { name: parsed.data.name } })

    await logAction({
      condo_id: new ObjectId(condoId),
      entity: 'condominiums',
      entity_id: new ObjectId(condoId),
      action: 'updated',
      actor_id: new ObjectId(actorId),
      actor_name: actorName,
      before: { name: before.name },
      after: { name: parsed.data.name },
    })

    // O nome do condomínio vai no token: reemite para a barra lateral mostrar o novo
    const response = NextResponse.json({ ok: true })
    await setSessionCookie(response, { ...session, condoName: parsed.data.name })
    return response
  } catch (err) {
    return serverError('[PUT /api/condo]', err)
  }
}
