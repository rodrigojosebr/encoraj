import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { ObjectId } from 'mongodb'
import { users, condominiums } from '@/lib/db/collections'
import DashboardShell from './_components/DashboardShell'
import { getRole } from '@/lib/db/status-map'

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
  const headersList = await headers()
  const role = headersList.get('x-user-role')
  const userId = headersList.get('x-user-id')
  const condoId = headersList.get('x-condo-id')
  const name = decodeURIComponent(headersList.get('x-user-name') ?? '')
  const condoName = decodeURIComponent(headersList.get('x-condo-name') ?? '')

  if (!role) redirect('/login')

  const [visibleItems, roleLabel, userDoc, condoDoc] = await Promise.all([
    Promise.resolve(
      NAV_ITEMS
        .filter((item) => item.roles.includes(role))
        .map(({ href, label }) => ({ href, label }))
    ),
    getRole(role).then(r => r.label).catch(() => role),
    userId ? (await users()).findOne({ _id: new ObjectId(userId) }, { projection: { photo_url: 1 } }) : null,
    condoId ? (await condominiums()).findOne({ _id: new ObjectId(condoId) }, { projection: { photo_url: 1 } }) : null,
  ])

  const userPhoto = userDoc?.photo_url ?? null
  const condoPhoto = condoDoc?.photo_url ?? null

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
