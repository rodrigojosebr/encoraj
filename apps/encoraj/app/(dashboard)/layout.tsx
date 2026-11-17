import { redirect } from 'next/navigation'
import { ObjectId } from 'mongodb'
import { users, condominiums } from '@/lib/db/collections'
import DashboardShell from './_components/DashboardShell'
import { getRole } from '@/lib/db/status-map'
import { getSession } from '@/lib/auth/session'
import { signS3Url } from '@/lib/s3/sign'

interface NavItem {
  href: string
  label: string
  roles: string[]
}

const NAV_ITEMS: NavItem[] = [
  { href: '/',           label: 'Dashboard',    roles: ['admin', 'porteiro', 'sindico', 'zelador'] },
  { href: '/packages',  label: 'Encomendas',    roles: ['admin', 'porteiro'] },
  { href: '/residents', label: 'Moradores',     roles: ['admin', 'zelador'] },
  { href: '/users',     label: 'Usuários',      roles: ['admin'] },
  { href: '/reports',   label: 'Relatórios',    roles: ['admin', 'sindico'] },
  { href: '/settings',  label: 'Configurações', roles: ['admin'] },
  { href: '/profile',   label: 'Meu perfil',    roles: ['admin', 'porteiro', 'sindico', 'zelador'] },
]

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Valida no banco: usuário desativado, com role alterado ou senha trocada perde o acesso
  // na próxima navegação, sem esperar o JWT expirar. /api/auth/logout limpa o cookie.
  const session = await getSession()
  if (!session) redirect('/api/auth/logout')

  const { role, userId, condoId, userName: name, condoName } = session

  const [visibleItems, roleLabel, userDoc, condoDoc] = await Promise.all([
    Promise.resolve(
      NAV_ITEMS
        .filter((item) => item.roles.includes(role))
        .map(({ href, label }) => ({ href, label }))
    ),
    getRole(role).then(r => r.label).catch(() => role),
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
      role={role}
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
