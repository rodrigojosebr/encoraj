import { redirect } from 'next/navigation'
import { ObjectId } from 'mongodb'
import { users, condominiums } from '@/lib/db/collections'
import DashboardShell from './_components/DashboardShell'
import { getSessionForPasswordChange } from '@/lib/auth/session'
import { signS3Url } from '@/lib/s3/sign'
import { can, type Permission } from '@/lib/auth/permissions'
import { roleLabels } from '@/lib/auth/user-roles'

interface NavItem {
  href: string
  label: string
  /** Sem permissão = qualquer usuário logado vê */
  permission?: Permission
}

const NAV_ITEMS: NavItem[] = [
  { href: '/',              label: 'Dashboard' },
  { href: '/packages',      label: 'Encomendas',       permission: 'packages.register' },
  { href: '/residents',     label: 'Moradores',        permission: 'residents.write' },
  { href: '/users',         label: 'Usuários',         permission: 'users.manage' },
  { href: '/reports',       label: 'Relatórios',       permission: 'reports.view' },
  { href: '/settings',      label: 'Configurações',    permission: 'condo.manage' },
  { href: '/condos',        label: 'Administradora',   permission: 'org.condos' },
  { href: '/profile',       label: 'Meu perfil' },
  // Plataforma (todos os condomínios)
  { href: '/admin/condos',      label: 'Condomínios',      permission: 'platform.admin' },
  { href: '/admin/errors',      label: 'Erros do sistema', permission: 'platform.admin' },
  { href: '/admin/ai',          label: 'Uso de IA',        permission: 'platform.admin' },
  { href: '/admin/permissions', label: 'Permissões',       permission: 'platform.admin' },
  { href: '/admin/releases',    label: 'Releases',         permission: 'platform.admin' },
]

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Valida no banco: usuário desativado, com role alterado ou senha trocada perde o acesso
  // na próxima navegação, sem esperar o JWT expirar. /api/auth/logout limpa o cookie.
  const session = await getSessionForPasswordChange()
  if (!session) redirect('/api/auth/logout')
  // Senha definida por outra pessoa: nada do sistema abre antes de a pessoa trocar
  if (session.mustChangePassword) redirect('/change-password')

  const { roles, userId, condoId, userName: name, condoName } = session

  const [visibleItems, roleLabel, userDoc, condoDoc] = await Promise.all([
    Promise.resolve(
      NAV_ITEMS
        .filter((item) => !item.permission || can(session, item.permission))
        .map(({ href, label }) => ({ href, label }))
    ),
    roleLabels(roles),
    (await users()).findOne({ _id: new ObjectId(userId) }, { projection: { photo_url: 1 } }),
    (await condominiums()).findOne({ _id: new ObjectId(condoId) }, { projection: { photo_url: 1 } }),
  ])

  const [userPhoto, condoPhoto] = await Promise.all([
    signS3Url(userDoc?.photo_url),
    signS3Url(condoDoc?.photo_url),
  ])

  return (
    <DashboardShell
      name={name}
      roleLabel={roleLabel}
      condoName={condoName}
      userPhoto={userPhoto}
      condoPhoto={condoPhoto}
      visibleItems={visibleItems}
    >
      {children}
    </DashboardShell>
  )
}
