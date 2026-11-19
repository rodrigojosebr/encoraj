import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getSession } from '@/lib/auth/session'
import { users } from '@/lib/db/collections'
import { userRoleNames } from '@/lib/auth/user-roles'
import { logAction } from '@/lib/audit/log'
import { ERASE_CONFIRMATION, eraseUser } from '@/lib/lgpd/erase'
import { reportError } from '@/lib/observability/report'
import { canManageUserWith } from '@/lib/auth/roles'
import { can } from '@/lib/auth/permissions'

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
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (!can(session, 'data.erase')) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    if (id === session.userId) {
      return NextResponse.json(
        { error: 'Você não pode remover a própria conta. Para encerrar tudo, use a remoção do condomínio.' },
        { status: 400 },
      )
    }

    const body = await request.json().catch(() => ({}))
    if (body?.confirm !== ERASE_CONFIRMATION) {
      return NextResponse.json(
        { error: `Confirmação ausente. Envie { "confirm": "${ERASE_CONFIRMATION}" }.` },
        { status: 400 },
      )
    }

    const condoOid = new ObjectId(session.condoId)

    // Ninguém remove quem está acima (super admin, admin da administradora)
    const target = await (await users()).findOne(
      { _id: new ObjectId(id), condo_id: condoOid },
      { projection: { role_ids: 1 } },
    )
    if (target && !canManageUserWith(session, await userRoleNames(target))) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const result = await eraseUser(condoOid, new ObjectId(id))
    if (!result) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

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
    await reportError('[DELETE /api/users/[id]/erase]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
