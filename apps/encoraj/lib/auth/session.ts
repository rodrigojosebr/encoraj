import { cookies } from 'next/headers'
import { ObjectId } from 'mongodb'
import { condominiums, users } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { verifyToken } from './jwt'
import { AUTH_COOKIE } from './cookies'
import { ORG_ADMIN_ROLE, sameRoles, SUPER_ADMIN_ROLE, tokenRoles } from './roles'
import { userRoleNames } from './user-roles'

export interface Session {
  userId: string
  userName: string
  /** Todas as roles do usuário. Para autorizar, usar can(session, 'permissão') */
  roles: string[]
  condoId: string
  condoName: string
  /** Administradora do usuário, quando ele é admin de uma. Só vem do getSession() (banco) */
  orgId?: string
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

  const roles = tokenRoles(payload)
  if (!payload.sub || roles.length === 0 || !payload.condo_id) return null
  if (!ObjectId.isValid(payload.sub) || !ObjectId.isValid(payload.condo_id)) return null

  return {
    userId: payload.sub,
    userName: payload.name ?? '',
    roles,
    condoId: payload.condo_id,
    condoName: payload.condo_name ?? '',
    issuedAt: payload.iat ?? 0,
  }
}

/**
 * Sessão de quem ainda pode estar com a senha definida por outra pessoa. Só para o que
 * precisa funcionar ANTES da troca: a tela e a rota de troca de senha e o layout do
 * dashboard (que manda para /change-password). Todo o resto usa getSession().
 */
export async function getSessionForPasswordChange(): Promise<(Session & { mustChangePassword: boolean }) | null> {
  return loadSession()
}

/**
 * Sessão validada contra o banco — é o que toda rota de API usa. Além do que
 * loadSession() confere, recusa quem ainda não trocou a senha recebida de outra pessoa:
 * até trocar, a pessoa não alcança nada além da troca de senha.
 */
export async function getSession(): Promise<Session | null> {
  const loaded = await loadSession()
  if (!loaded || loaded.mustChangePassword) return null
  const { mustChangePassword: _flag, ...session } = loaded
  void _flag
  return session
}

/**
 * Identidade conferida no banco. Retorna null se o usuário foi desativado, mudou de
 * roles, está num condomínio em que não pode estar ou trocou a senha depois que o token foi emitido — é isso
 * que torna o JWT revogável antes das 8h de validade.
 *
 */
async function loadSession(): Promise<(Session & { mustChangePassword: boolean }) | null> {
  const identity = await readSession()
  if (!identity) return null

  const { issuedAt, ...session } = identity

  const col = await users()
  const user = await col.findOne(
    { _id: new ObjectId(session.userId) },
    { projection: { condo_id: 1, org_id: 1, role_ids: 1, status_id: 1, password_changed_at: 1, must_change_password: 1 } },
  )
  if (!user) return null

  const { _id: activeStatusId } = await getStatus('active')
  if (!user.status_id.equals(activeStatusId)) return null

  // O conjunto de roles do token tem que ser exatamente o do banco: ganhou ou perdeu
  // uma role, o token antigo deixa de valer e a pessoa entra de novo.
  const currentRoles = await userRoleNames(user)
  if (currentRoles.length === 0 || !sameRoles(currentRoles, session.roles)) return null

  // Só o admin de administradora tem administradora — org_id sem a role não vale nada
  const orgId = currentRoles.includes(ORG_ADMIN_ROLE) ? user.org_id : undefined

  // Cada um só existe no próprio condomínio. Duas exceções, que "entram" em outro por
  // POST /api/condos/{id}/enter: o super admin (qualquer condomínio que exista) e o admin
  // da administradora (só condomínio dela).
  if (user.condo_id.toString() !== session.condoId) {
    const isSuperAdmin = currentRoles.includes(SUPER_ADMIN_ROLE)
    if (!isSuperAdmin && !orgId) return null
    const condo = await (await condominiums()).findOne(
      { _id: new ObjectId(session.condoId) },
      { projection: { org_id: 1 } },
    )
    if (!condo) return null
    if (!isSuperAdmin && !(condo.org_id && orgId && condo.org_id.equals(orgId))) return null
  }

  if (user.password_changed_at) {
    const changedAtSec = Math.floor(user.password_changed_at.getTime() / 1000)
    if (issuedAt < changedAtSec) return null
  }

  return {
    ...session,
    ...(orgId ? { orgId: orgId.toString() } : {}),
    mustChangePassword: user.must_change_password === true,
  }
}
