/**
 * Permissões são SOMADAS: cada usuário tem um conjunto de roles e pode fazer tudo que
 * qualquer uma delas permite. Não existe "role principal" nem herança entre roles —
 * quem precisa de dois papéis recebe as duas roles.
 *
 * Este arquivo é puro (sem banco) para poder ser usado também no proxy.
 */

/** Quem opera a plataforma: enxerga /admin/*, com dados de TODOS os condomínios. */
export const SUPER_ADMIN_ROLE = 'superadmin'

/**
 * Admin de uma administradora: pode tudo em TODOS os condomínios dela (users.org_id diz
 * qual) e cria condomínios dentro dela. Condomínio autogerido não tem administradora —
 * ali quem manda é o `admin` do próprio condomínio.
 */
export const ORG_ADMIN_ROLE = 'administradora'

/** Roles que um admin de condomínio pode dar e tirar pela tela de usuários */
export const ASSIGNABLE_ROLES = ['admin', 'zelador', 'porteiro', 'sindico'] as const
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number]

/**
 * Roles que a tela e a API de usuários NUNCA atribuem nem removem. `superadmin` só entra
 * por alteração direta no banco (ver CLAUDE.md). `administradora` só nasce junto com a
 * administradora, criada pelo super admin (POST /api/admin/organizations).
 */
export const UNASSIGNABLE_ROLES = ['morador', SUPER_ADMIN_ROLE, ORG_ADMIN_ROLE]

/** O usuário tem pelo menos uma destas roles? */
export function hasRole(subject: { roles: readonly string[] }, ...names: string[]): boolean {
  return names.some((name) => subject.roles.includes(name))
}

/**
 * Quem pode editar, desativar ou remover um usuário com estas roles? Ninguém mexe em quem
 * está acima: senão bastaria trocar a senha do alvo para assumir o lugar dele.
 *  - super admin → só outro super admin
 *  - admin da administradora → outro admin da administradora, ou super admin
 *  - demais → quem tiver a permissão da rota
 */
export function canManageUserWith(actor: { roles: readonly string[] }, targetRoles: readonly string[]): boolean {
  if (targetRoles.includes(SUPER_ADMIN_ROLE)) return hasRole(actor, SUPER_ADMIN_ROLE)
  if (targetRoles.includes(ORG_ADMIN_ROLE)) return hasRole(actor, SUPER_ADMIN_ROLE, ORG_ADMIN_ROLE)
  return true
}

/** Roles de um token. Token sem a lista (ou com lixo dentro) não tem role nenhuma. */
export function tokenRoles(payload: { roles?: unknown }): string[] {
  if (!Array.isArray(payload.roles)) return []
  return payload.roles.filter((role): role is string => typeof role === 'string' && role.length > 0)
}

/** Mesmo conjunto de roles, sem importar ordem nem repetição. */
export function sameRoles(a: readonly string[], b: readonly string[]): boolean {
  const left = new Set(a)
  const right = new Set(b)
  return left.size === right.size && [...left].every((role) => right.has(role))
}
