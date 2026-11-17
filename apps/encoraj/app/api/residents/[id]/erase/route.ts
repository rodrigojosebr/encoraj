import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getSession } from '@/lib/auth/session'
import { logAction } from '@/lib/audit/log'
import { ERASE_CONFIRMATION, eraseResident } from '@/lib/lgpd/erase'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * Remoção DEFINITIVA de um morador (pedido do titular — LGPD). Só admin; sem botão na
 * interface. Corpo: { "confirm": "APAGAR DEFINITIVAMENTE" }. Não tem como desfazer.
 */
export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (session.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const body = await request.json().catch(() => ({}))
    if (body?.confirm !== ERASE_CONFIRMATION) {
      return NextResponse.json(
        { error: `Confirmação ausente. Envie { "confirm": "${ERASE_CONFIRMATION}" }.` },
        { status: 400 },
      )
    }

    const condoOid = new ObjectId(session.condoId)
    const result = await eraseResident(condoOid, new ObjectId(id))
    if (!result) return NextResponse.json({ error: 'Morador não encontrado' }, { status: 404 })

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
    console.error('[DELETE /api/residents/[id]/erase]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
