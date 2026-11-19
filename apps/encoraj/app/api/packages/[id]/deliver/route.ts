import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { timingSafeEqual } from 'crypto'
import { packages } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { getSession } from '@/lib/auth/session'
import { checkRateLimit, isRateLimited } from '@/lib/auth/rateLimit'
import { logAction } from '@/lib/audit/log'
import { reportError } from '@/lib/observability/report'
import { can } from '@/lib/auth/permissions'

interface RouteContext {
  params: Promise<{ id: string }>
}

const MAX_PIN_ATTEMPTS = 10
const PIN_WINDOW_MS = 15 * 60 * 1000

function samePin(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (!can(session, 'packages.deliver')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const pin: string | undefined = typeof body?.pin === 'string' ? body.pin.trim() : undefined

    const col = await packages()
    const pkgFilter = { _id: new ObjectId(id), condo_id: new ObjectId(session.condoId) }
    const doc = await col.findOne(pkgFilter)

    if (!doc) {
      return NextResponse.json({ error: 'Encomenda não encontrada' }, { status: 404 })
    }

    const { _id: deliveredStatusId } = await getStatus('delivered')
    if (doc.status_id.equals(deliveredStatusId)) {
      return NextResponse.json({ error: 'Encomenda já foi entregue' }, { status: 409 })
    }

    // Retirada exige o PIN, sempre. Encomenda em aberto sem PIN não deveria existir (o PIN
    // só é apagado na remoção definitiva do morador, que exige tudo já retirado) — se
    // aparecer uma, é dado inconsistente e ela não é entregue por aqui.
    if (!doc.delivery_pin) {
      return NextResponse.json({ error: 'Encomenda sem código de retirada.' }, { status: 409 })
    }
    const rlKey = `pin:${id}`
    if (await isRateLimited(rlKey, MAX_PIN_ATTEMPTS)) {
      return NextResponse.json(
        { error: 'Muitas tentativas de código. Aguarde alguns minutos.' },
        { status: 429 },
      )
    }
    if (!pin) {
      return NextResponse.json({ error: 'Código de retirada obrigatório.' }, { status: 400 })
    }
    if (!samePin(pin, doc.delivery_pin)) {
      await checkRateLimit(rlKey, MAX_PIN_ATTEMPTS, PIN_WINDOW_MS)
      return NextResponse.json({ error: 'Código de retirada incorreto.' }, { status: 400 })
    }

    // Atômico: só entrega se ainda não estiver entregue (dois cliques / dois porteiros)
    const deliveredAt = new Date()
    const result = await col.updateOne(
      { ...pkgFilter, status_id: { $ne: deliveredStatusId } },
      { $set: { status_id: deliveredStatusId, delivered_at: deliveredAt, delivered_by: new ObjectId(session.userId) } },
    )
    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: 'Encomenda já foi entregue' }, { status: 409 })
    }

    await logAction({
      condo_id: new ObjectId(session.condoId),
      entity: 'packages',
      entity_id: new ObjectId(id),
      action: 'updated',
      actor_id: new ObjectId(session.userId),
      actor_name: session.userName,
      before: { status_id: doc.status_id },
      after: { status_id: deliveredStatusId, delivered_at: deliveredAt },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    await reportError('[POST /api/packages/[id]/deliver]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
