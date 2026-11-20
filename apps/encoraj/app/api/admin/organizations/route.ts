import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { getSession } from '@/lib/auth/session'
import { can } from '@/lib/auth/permissions'
import { emailSchema } from '@/lib/auth/email'
import { passwordSchema } from '@/lib/auth/password'
import { createOrganizationWithAdmin } from '@/lib/condos/create'
import { logAction } from '@/lib/audit/log'
import { conflict, forbidden, parseBody, serverError, unauthorized } from '@/lib/api/http'

const schema = z.object({
  org_name: z.string().trim().min(3, 'Nome da administradora muito curto.').max(120),
  condo_name: z.string().trim().min(3, 'Nome do condomínio muito curto.').max(120),
  admin_name: z.string().trim().min(2, 'Nome do administrador muito curto.').max(120),
  admin_email: emailSchema,
  admin_password: passwordSchema,
})

/**
 * Cria uma administradora, com o primeiro condomínio e o admin dela. Só super admin.
 * Dali em diante o admin da administradora cria os outros condomínios (POST /api/org/condos).
 */
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return unauthorized()
    if (!can(session, 'platform.admin')) return forbidden()

    const parsed = await parseBody(request, schema)
    if (parsed.error) return parsed.error

    const data = parsed.data
    const result = await createOrganizationWithAdmin({
      orgName: data.org_name,
      condoName: data.condo_name,
      adminName: data.admin_name,
      adminEmail: data.admin_email,
      adminPassword: data.admin_password,
    })
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
      after: { name: data.condo_name, slug: result.slug, org_id: result.orgId, org_name: data.org_name, admin_id: result.adminId },
    })

    return NextResponse.json({ _id: result.orgId, condo_id: result.condoId }, { status: 201 })
  } catch (err) {
    return serverError('[POST /api/admin/organizations]', err)
  }
}
