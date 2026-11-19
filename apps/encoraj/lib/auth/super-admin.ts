import { getSession, type Session } from './session'
import { can } from './permissions'

/**
 * Sessão válida de um super admin, ou null. Rotas e páginas de /admin começam por aqui.
 * As roles são conferidas no banco pelo getSession(): tirou a role, perdeu o acesso.
 */
export async function getSuperAdminSession(): Promise<Session | null> {
  const session = await getSession()
  return session && can(session, 'platform.admin') ? session : null
}
