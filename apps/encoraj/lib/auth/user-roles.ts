import type { ObjectId } from 'mongodb'
import { getRole, getRoleById } from '@/lib/db/status-map'

/** Só o campo de roles do usuário — aceita o documento inteiro ou uma projeção */
interface RoleFields {
  role_ids?: ObjectId[]
}

export function userRoleIds(user: RoleFields): ObjectId[] {
  return user.role_ids ?? []
}

/** Nomes das roles do usuário. Id que não existe mais na coleção de roles é ignorado. */
export async function userRoleNames(user: RoleFields): Promise<string[]> {
  const roles = await Promise.all(userRoleIds(user).map((id) => getRoleById(id).catch(() => null)))
  return [...new Set(roles.flatMap((role) => (role ? [role.name] : [])))]
}

/** "Administrador, Porteiro" — rótulos vindos do banco, para exibir. */
export async function roleLabels(names: readonly string[]): Promise<string> {
  const labels = await Promise.all(names.map((name) => getRole(name).then((r) => r.label).catch(() => name)))
  return labels.join(', ')
}
