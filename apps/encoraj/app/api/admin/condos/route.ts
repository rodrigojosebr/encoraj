import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { getSession } from '@/lib/auth/session'
import { can } from '@/lib/auth/permissions'
import { emailSchema, passwordSchema } from '@/lib/auth/email'
import { createCondoWithAdmin } from '@/lib/condos/create'
import { logAction } from '@/lib/audit/log'
import { reportError } from '@/lib/observability/report'

const schema = z.object({
  condoName: z.string().trim().min(3, 'Nome do condomínio muito curto.').max(120),
  adminName: z.string().trim().min(2, 'Nome do administrador muito curto.').max(120),
  adminEmail: emailSchema,
  adminPassword: passwordSchema,
})

/**
 * Cria um condomínio com o seu primeiro administrador. Só super admin: é a única
 * forma de um condomínio passar a existir (não há cadastro público).
 */
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (!can(session, 'platform.admin')) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
    }

    const result = await createCondoWithAdmin(parsed.data)
    if (!result.ok) {
      return NextResponse.json({ error: 'Este email já está em uso.' }, { status: 409 })
    }

    await logAction({
      condo_id: result.condoId,
      entity: 'condominiums',
      entity_id: result.condoId,
      action: 'created',
      actor_id: new ObjectId(session.userId),
      actor_name: session.userName,
      after: { name: parsed.data.condoName, slug: result.slug, admin_id: result.adminId },
    })

    return NextResponse.json({ _id: result.condoId, slug: result.slug }, { status: 201 })
  } catch (err) {
    await reportError('[POST /api/admin/condos]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
