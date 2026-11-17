import { cookies } from 'next/headers'
import { ObjectId } from 'mongodb'
import { users } from '@/lib/db/collections'
import { getStatus, getRoleById } from '@/lib/db/status-map'
import { verifyToken } from './jwt'
import { AUTH_COOKIE } from './cookies'

export interface Session {
  userId: string
  userName: string
  role: string
  condoId: string
  condoName: string
}

/**
 * Identidade lida do cookie, com a assinatura do JWT verificada aqui mesmo.
 * Não depende de header injetado pelo middleware: se o middleware for contornado
 * (já houve CVE disso no Next), ninguém consegue forjar identidade por header.
 *
 * Não consulta o banco — use em Server Components de página (o layout do dashboard
 * já chamou getSession() no mesmo request). Rotas de API usam getSession().
 */
export async function readSession(): Promise<(Session & { issuedAt: number }) | null> {
  const token = (await cookies()).get(AUTH_COOKIE)?.value
  if (!token) return null

  let payload
  try {
    payload = await verifyToken(token)
  } catch {
    return null
  }

  if (!payload.sub || !payload.role || !payload.condo_id) return null
  if (!ObjectId.isValid(payload.sub) || !ObjectId.isValid(payload.condo_id)) return null

  return {
    userId: payload.sub,
    userName: payload.name ?? '',
    role: payload.role,
    condoId: payload.condo_id,
    condoName: payload.condo_name ?? '',
    issuedAt: payload.iat ?? 0,
  }
}

/**
 * Sessão validada contra o banco. Retorna null se o usuário foi desativado, mudou de
 * role, mudou de condomínio ou trocou a senha depois que o token foi emitido — é isso
 * que torna o JWT revogável antes das 8h de validade.
 *
 * Toda rota de API usa esta função; o layout do dashboard usa para as páginas.
 */
export async function getSession(): Promise<Session | null> {
  const identity = await readSession()
  if (!identity) return null

  const { issuedAt, ...session } = identity

  const col = await users()
  const user = await col.findOne(
    { _id: new ObjectId(session.userId) },
    { projection: { condo_id: 1, role_id: 1, status_id: 1, password_changed_at: 1 } },
  )
  if (!user) return null

  const { _id: activeStatusId } = await getStatus('active')
  if (!user.status_id.equals(activeStatusId)) return null
  if (user.condo_id.toString() !== session.condoId) return null

  const role = await getRoleById(user.role_id).catch(() => null)
  if (!role || role.name !== session.role) return null

  if (user.password_changed_at) {
    const changedAtSec = Math.floor(user.password_changed_at.getTime() / 1000)
    if (issuedAt < changedAtSec) return null
  }

  return session
}
