import { notFound } from 'next/navigation'
import { Check } from 'lucide-react'
import { css } from '@/styled-system/css'
import { getSuperAdminSession } from '@/lib/auth/super-admin'
import { can, EVERYONE_CAN, PAGE_PERMISSIONS, PERMISSIONS, type Permission } from '@/lib/auth/permissions'
import { ASSIGNABLE_ROLES, ORG_ADMIN_ROLE, SUPER_ADMIN_ROLE } from '@/lib/auth/roles'
import { getRole } from '@/lib/db/status-map'
import { h2Css, mutedCss } from '@/app/(dashboard)/_lib/styles'

const thCss = css({ px: '3', py: '2', fontSize: 'xs', fontWeight: 'semibold', color: 'gray.500', textTransform: 'uppercase', textAlign: 'center', _dark: { color: 'gray.400' } })
const tdCss = css({ px: '3', py: '2.5', fontSize: 'sm', color: 'gray.800', borderTop: '1px solid', borderColor: 'gray.100', _dark: { color: 'gray.200', borderColor: 'gray.800' } })
const cardCss = css({ bg: 'white', border: '1px solid', borderColor: 'gray.200', borderRadius: 'lg', p: { base: '4', md: '6' }, display: 'flex', flexDir: 'column', gap: '3', _dark: { bg: 'gray.900', borderColor: 'gray.700' } })

/**
 * Consulta: o que cada role pode fazer. Só leitura, gerada do mapa de permissões do
 * código (lib/auth/permissions.ts) — sempre fiel ao que o sistema realmente aplica.
 */
export default async function AdminPermissionsPage() {
  if (!(await getSuperAdminSession())) notFound()

  const roleNames = [...ASSIGNABLE_ROLES, ORG_ADMIN_ROLE, SUPER_ADMIN_ROLE]
  const roles = await Promise.all(
    roleNames.map(async (name) => ({ name, label: await getRole(name).then((r) => r.label).catch(() => name) })),
  )

  const entries = Object.entries(PERMISSIONS) as Array<[Permission, (typeof PERMISSIONS)[Permission]]>
  const groups = [...new Set(entries.map(([, permission]) => permission.group))]
  const pagesOf = (key: Permission) => PAGE_PERMISSIONS.filter((page) => page.permission === key).map((page) => page.prefix)

  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '6' })}>
      <div>
        <h1 className={css({ fontSize: '2xl', fontWeight: 'bold', color: 'gray.900', _dark: { color: 'gray.50' } })}>Permissões</h1>
        <p className={mutedCss}>
          O que cada perfil pode fazer. As permissões se somam: quem tem dois perfis pode tudo que qualquer um deles permite.
        </p>
      </div>

      <section className={cardCss}>
        <div className={css({ overflowX: 'auto' })}>
          <table className={css({ w: 'full', minW: '820px', borderCollapse: 'collapse' })}>
            <thead>
              <tr>
                <th className={css({ px: '3', py: '2', fontSize: 'xs', fontWeight: 'semibold', color: 'gray.500', textTransform: 'uppercase', textAlign: 'left', _dark: { color: 'gray.400' } })}>
                  Permissão
                </th>
                {roles.map((role) => (
                  <th key={role.name} className={thCss}>{role.label}</th>
                ))}
              </tr>
            </thead>
            {groups.map((group) => (
              <tbody key={group}>
                <tr>
                  <td
                    colSpan={roles.length + 1}
                    className={css({ px: '3', pt: '5', pb: '1', fontSize: 'xs', fontWeight: 'bold', color: 'blue.600', textTransform: 'uppercase', letterSpacing: 'wide', _dark: { color: 'blue.400' } })}
                  >
                    {group}
                  </td>
                </tr>
                {entries
                  .filter(([, permission]) => permission.group === group)
                  .map(([key, permission]) => (
                    <tr key={key}>
                      <td className={tdCss}>
                        {permission.label}
                        <span className={css({ display: 'block', fontSize: 'xs', fontFamily: 'mono', color: 'gray.400', _dark: { color: 'gray.500' } })}>
                          {key}
                          {pagesOf(key).length > 0 ? ` · telas: ${pagesOf(key).join(', ')}` : ''}
                        </span>
                      </td>
                      {roles.map((role) => {
                        const allowed = can({ roles: [role.name] }, key)
                        return (
                          <td key={role.name} className={tdCss} style={{ textAlign: 'center' }} aria-label={allowed ? 'Pode' : 'Não pode'}>
                            {allowed ? <Check size={16} color="#16a34a" style={{ display: 'inline' }} /> : <span className={css({ color: 'gray.300', _dark: { color: 'gray.700' } })}>—</span>}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
              </tbody>
            ))}
          </table>
        </div>
      </section>

      <section className={cardCss}>
        <h2 className={h2Css}>Qualquer usuário logado</h2>
        <ul className={css({ pl: '5', listStyleType: 'disc', fontSize: 'sm', color: 'gray.800', display: 'flex', flexDir: 'column', gap: '1', _dark: { color: 'gray.200' } })}>
          {EVERYONE_CAN.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className={cardCss}>
        <h2 className={h2Css}>Como isso é definido</h2>
        <p className={mutedCss}>
          Esta tela é só consulta. As permissões ficam no código, em <code>lib/auth/permissions.ts</code>, e mudam apenas com uma
          nova versão do sistema — nunca por configuração. O super admin pode tudo: cria os condomínios e, quando preciso,
          entra em qualquer um deles para agir lá dentro. Esse perfil não é atribuído por nenhuma tela: só direto no banco.
          O admin da administradora pode, em todos os condomínios dela, o mesmo que o admin de um condomínio — e nasce junto
          com a administradora, criada pelo super admin. Ninguém edita, desativa ou remove quem está acima: super admin só por
          outro super admin; admin da administradora só por outro admin dela ou pelo super admin.
        </p>
      </section>
    </div>
  )
}
