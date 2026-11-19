import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ObjectId } from 'mongodb'
import { condominiums } from '@/lib/db/collections'
import { getSession } from '@/lib/auth/session'
import { can } from '@/lib/auth/permissions'
import { signToken, verifyToken } from '@/lib/auth/jwt'
import { AUTH_COOKIE, COOKIE_OPTIONS } from '@/lib/auth/cookies'
import { reportError } from '@/lib/observability/report'

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
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (!can(session, 'org.condos')) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const condo = await (await condominiums()).findOne({ _id: new ObjectId(id) })
    const allowed = condo && (can(session, 'platform.admin') || (!!session.orgId && condo.org_id?.toString() === session.orgId))
    if (!condo || !allowed) return NextResponse.json({ error: 'Condomínio não encontrado' }, { status: 404 })

    // Mantém a identidade (quem é, roles, foto) e troca só o condomínio
    const current = await verifyToken((await cookies()).get(AUTH_COOKIE)!.value)
    const { condo_photo_url: _previousPhoto, ...identity } = current
    void _previousPhoto
    const token = await signToken({
      ...identity,
      condo_id: condo._id.toString(),
      condo_name: condo.name,
      ...(condo.photo_url ? { condo_photo_url: condo.photo_url } : {}),
    })

    const response = NextResponse.json({ ok: true, name: condo.name })
    response.cookies.set(AUTH_COOKIE, token, COOKIE_OPTIONS)
    return response
  } catch (err) {
    await reportError('[POST /api/condos/[id]/enter]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
