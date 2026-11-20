import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { getSession } from '@/lib/auth/session'
import { can } from '@/lib/auth/permissions'
import { emailSchema } from '@/lib/auth/email'
import { passwordSchema } from '@/lib/auth/password'
import { createCondoWithAdmin } from '@/lib/condos/create'
import { logAction } from '@/lib/audit/log'
import { conflict, forbidden, parseBody, serverError, unauthorized } from '@/lib/api/http'

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
    if (!session) return unauthorized()
    if (!can(session, 'platform.admin')) return forbidden()

    const parsed = await parseBody(request, schema)
    if (parsed.error) return parsed.error

    const result = await createCondoWithAdmin(parsed.data)
    if (!result.ok) {
      return conflict('Este email já está em uso.')
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
    return serverError('[POST /api/admin/condos]', err)
  }
}
