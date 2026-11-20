import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getSession } from '@/lib/auth/session'
import { logAction } from '@/lib/audit/log'
import { ERASE_CONFIRMATION, eraseResident } from '@/lib/lgpd/erase'
import { can } from '@/lib/auth/permissions'
import { badRequest, forbidden, notFound, serverError, unauthorized } from '@/lib/api/http'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * Remoção DEFINITIVA de um morador (pedido do titular — LGPD). Só admin; sem botão na
 * interface. Corpo: { "confirm": "APAGAR DEFINITIVAMENTE" }. Não tem como desfazer.
 * Recusa (409) enquanto o morador tiver encomenda aguardando retirada.
 */
export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session) return unauthorized()
    if (!can(session, 'data.erase')) return forbidden()
    if (!ObjectId.isValid(id)) return badRequest('ID inválido.')

    const body = await request.json().catch(() => ({}))
    if (body?.confirm !== ERASE_CONFIRMATION) {
      return badRequest(`Confirmação ausente. Envie { "confirm": "${ERASE_CONFIRMATION}" }.`)
    }

    const condoOid = new ObjectId(session.condoId)
    const result = await eraseResident(condoOid, new ObjectId(id))
    if (!result) return notFound('Morador não encontrado.')
    if ('pending' in result) {
      return NextResponse.json(
        {
          error: `Este morador tem ${result.pending} encomenda(s) aguardando retirada. Conclua as retiradas antes de remover os dados.`,
          pending: result.pending,
        },
        { status: 409 },
      )
    }

    // Registro da remoção em si — sem nenhum dado do titular
    await logAction({
      condo_id: condoOid,
      entity: 'residents',
      entity_id: new ObjectId(id),
      action: 'deleted',
      actor_id: new ObjectId(session.userId),
      actor_name: session.userName,
      after: { erased: true, ...result },
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    return serverError('[DELETE /api/residents/[id]/erase]', err)
  }
}
