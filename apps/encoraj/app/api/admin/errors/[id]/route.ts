import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { errorLogs } from '@/lib/db/collections'
import { getSession } from '@/lib/auth/session'
import { getSuperAdminSession } from '@/lib/auth/super-admin'
import { reportError } from '@/lib/observability/report'

const schema = z.object({ resolved: z.boolean() })

interface RouteContext {
  params: Promise<{ id: string }>
}

/** Marca um erro como resolvido (ou reabre). Só super admin. */
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    if (!(await getSession())) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const session = await getSuperAdminSession()
    if (!session) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

    const result = await (await errorLogs()).updateOne(
      { _id: new ObjectId(id) },
      parsed.data.resolved
        ? { $set: { resolved_at: new Date(), resolved_by: new ObjectId(session.userId) } }
        : { $unset: { resolved_at: '', resolved_by: '' } },
    )
    if (result.matchedCount === 0) return NextResponse.json({ error: 'Erro não encontrado' }, { status: 404 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    await reportError('[PATCH /api/admin/errors/[id]]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
