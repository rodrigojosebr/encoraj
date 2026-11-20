import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { errorLogs } from '@/lib/db/collections'
import { getSession } from '@/lib/auth/session'
import { getSuperAdminSession } from '@/lib/auth/super-admin'
import { badRequest, forbidden, notFound, parseBody, serverError, unauthorized } from '@/lib/api/http'

const schema = z.object({ resolved: z.boolean() })

interface RouteContext {
  params: Promise<{ id: string }>
}

/** Marca um erro como resolvido (ou reabre). Só super admin. */
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    if (!(await getSession())) return unauthorized()
    const session = await getSuperAdminSession()
    if (!session) return forbidden()
    if (!ObjectId.isValid(id)) return badRequest('ID inválido.')

    const parsed = await parseBody(request, schema)
    if (parsed.error) return parsed.error

    const result = await (await errorLogs()).updateOne(
      { _id: new ObjectId(id) },
      parsed.data.resolved
        ? { $set: { resolved_at: new Date(), resolved_by: new ObjectId(session.userId) } }
        : { $unset: { resolved_at: '', resolved_by: '' } },
    )
    if (result.matchedCount === 0) return notFound('Erro não encontrado.')

    return NextResponse.json({ ok: true })
  } catch (err) {
    return serverError('[PATCH /api/admin/errors/[id]]', err)
  }
}
