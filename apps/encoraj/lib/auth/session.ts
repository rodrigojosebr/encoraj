import { headers } from 'next/headers'
import { ObjectId } from 'mongodb'
import { users } from '@/lib/db/collections'
import { getStatus, getRoleById } from '@/lib/db/status-map'

export interface Session {
  userId: string
  userName: string
  role: string
  condoId: string
  condoName: string
}

function decode(value: string | null): string {
  if (!value) return ''
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/**
 * Lê a identidade que o middleware injetou nos headers (sem consultar o banco).
 * Nome de usuário e de condomínio chegam codificados com encodeURIComponent.
 */
export async function readSessionHeaders(): Promise<(Session & { issuedAt: number }) | null> {
  const h = await headers()
  const userId = h.get('x-user-id')
  const role = h.get('x-user-role')
  const condoId = h.get('x-condo-id')

  if (!userId || !role || !condoId) return null
  if (!ObjectId.isValid(userId) || !ObjectId.isValid(condoId)) return null

  return {
    userId,
    role,
    condoId,
    userName: decode(h.get('x-user-name')),
    condoName: decode(h.get('x-condo-name')),
    issuedAt: Number(h.get('x-token-iat') ?? 0),
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
  const fromHeaders = await readSessionHeaders()
  if (!fromHeaders) return null

  const { issuedAt, ...session } = fromHeaders

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
