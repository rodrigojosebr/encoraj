import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { condominiums } from '@/lib/db/collections'
import { getSession } from '@/lib/auth/session'
import { can } from '@/lib/auth/permissions'
import { setSessionCookie } from '@/lib/auth/cookies'
import { badRequest, forbidden, notFound, serverError, unauthorized } from '@/lib/api/http'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * "Entrar" num condomínio: a sessão passa a apontar para lá, e todas as telas (usuários,
 * moradores, encomendas) passam a mostrar e alterar aquele condomínio. Só para quem pode
 * estar em mais de um:
 *  - super admin → qualquer condomínio;
 *  - admin da administradora → só os condomínios dela (os outros dão 404, como se não existissem).
 * Tudo que a pessoa fizer fica no audit log do condomínio, no nome dela.
 */
export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session) return unauthorized()
    if (!can(session, 'org.condos')) return forbidden()
    if (!ObjectId.isValid(id)) return badRequest('ID inválido.')

    const condo = await (await condominiums()).findOne({ _id: new ObjectId(id) })
    const allowed = condo && (can(session, 'platform.admin') || (!!session.orgId && condo.org_id?.toString() === session.orgId))
    if (!condo || !allowed) return notFound('Condomínio não encontrado.')

    // Mantém a identidade (quem é, roles) e troca só o condomínio
    const response = NextResponse.json({ ok: true, name: condo.name })
    await setSessionCookie(response, { ...session, condoId: condo._id.toString(), condoName: condo.name })
    return response
  } catch (err) {
    return serverError('[POST /api/condos/[id]/enter]', err)
  }
}
