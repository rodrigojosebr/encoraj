import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { condominiums } from '@/lib/db/collections'
import { getSession } from '@/lib/auth/session'
import { can } from '@/lib/auth/permissions'
import { createCondoInOrganization } from '@/lib/condos/create'
import { logAction } from '@/lib/audit/log'
import { conflict, forbidden, parseBody, serverError, unauthorized } from '@/lib/api/http'

const schema = z.object({
  condo_name: z.string().trim().min(3, 'Nome do condomínio muito curto.').max(120),
})

/**
 * Cria mais um condomínio dentro da administradora do condomínio em que a sessão está.
 * Para o admin da administradora é sempre a dele (getSession() só o deixa estar em
 * condomínio dela); o super admin cria na administradora do condomínio em que entrou.
 * A administradora nunca vem do corpo do request.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return unauthorized()
    if (!can(session, 'org.condos')) return forbidden()

    const parsed = await parseBody(request, schema)
    if (parsed.error) return parsed.error

    const current = await (await condominiums()).findOne(
      { _id: new ObjectId(session.condoId) },
      { projection: { org_id: 1 } },
    )
    if (!current?.org_id) {
      return conflict('Este condomínio é autogerido: não pertence a uma administradora.')
    }

    const { condoId, slug } = await createCondoInOrganization(current.org_id, parsed.data.condo_name)

    await logAction({
      condo_id: condoId,
      entity: 'condominiums',
      entity_id: condoId,
      action: 'created',
      actor_id: new ObjectId(session.userId),
      actor_name: session.userName,
      after: { name: parsed.data.condo_name, slug, org_id: current.org_id },
    })

    return NextResponse.json({ _id: condoId, slug }, { status: 201 })
  } catch (err) {
    return serverError('[POST /api/org/condos]', err)
  }
}
