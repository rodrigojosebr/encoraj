import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getSession } from '@/lib/auth/session'
import { users } from '@/lib/db/collections'
import { userRoleNames } from '@/lib/auth/user-roles'
import { logAction } from '@/lib/audit/log'
import { ERASE_CONFIRMATION, eraseUser } from '@/lib/lgpd/erase'
import { canManageUserWith } from '@/lib/auth/roles'
import { can } from '@/lib/auth/permissions'
import { badRequest, forbidden, notFound, serverError, unauthorized } from '@/lib/api/http'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * Remoção DEFINITIVA de um usuário da equipe (pedido do titular — LGPD). Só admin; sem
 * botão na interface. Corpo: { "confirm": "APAGAR DEFINITIVAMENTE" }. Não tem como desfazer.
 */
export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session) return unauthorized()
    if (!can(session, 'data.erase')) return forbidden()
    if (!ObjectId.isValid(id)) return badRequest('ID inválido.')
    if (id === session.userId) {
      return badRequest('Você não pode remover a própria conta. Para encerrar tudo, use a remoção do condomínio.')
    }

    const body = await request.json().catch(() => ({}))
    if (body?.confirm !== ERASE_CONFIRMATION) {
      return badRequest(`Confirmação ausente. Envie { "confirm": "${ERASE_CONFIRMATION}" }.`)
    }

    const condoOid = new ObjectId(session.condoId)

    // Ninguém remove quem está acima (super admin, admin da administradora)
    const target = await (await users()).findOne(
      { _id: new ObjectId(id), condo_id: condoOid },
      { projection: { role_ids: 1 } },
    )
    if (target && !canManageUserWith(session, await userRoleNames(target))) {
      return forbidden()
    }

    const result = await eraseUser(condoOid, new ObjectId(id))
    if (!result) return notFound('Usuário não encontrado.')

    await logAction({
      condo_id: condoOid,
      entity: 'users',
      entity_id: new ObjectId(id),
      action: 'deleted',
      actor_id: new ObjectId(session.userId),
      actor_name: session.userName,
      after: { erased: true, ...result },
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    return serverError('[DELETE /api/users/[id]/erase]', err)
  }
}
