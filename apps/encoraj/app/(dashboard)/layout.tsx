import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Role } from '@/lib/db/collections'
import { css } from '@/styled-system/css'
import LogoutButton from './_components/LogoutButton'

interface NavItem {
  href: string
  label: string
  roles: Role[]
}

const NAV_ITEMS: NavItem[] = [
  { href: '/',           label: 'Dashboard',   roles: ['admin', 'porteiro', 'sindico'] },
  { href: '/packages',  label: 'Encomendas',   roles: ['admin', 'porteiro'] },
  { href: '/residents', label: 'Moradores',    roles: ['admin'] },
  { href: '/users',     label: 'Usuários',     roles: ['admin'] },
  { href: '/reports',   label: 'Relatórios',   roles: ['admin', 'sindico'] },
]

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const role = headersList.get('x-user-role') as Role | null
  const name = headersList.get('x-user-name')

  if (!role) redirect('/login')

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role))

  return (
    <div className={css({ display: 'flex', minH: '100vh', bg: 'gray.50' })}>
      {/* Sidebar */}
      <aside
        className={css({
          w: '220px',
          flexShrink: 0,
          bg: 'white',
          borderRight: '1px solid',
          borderColor: 'gray.200',
          display: 'flex',
          flexDir: 'column',
          p: '4',
          gap: '1',
        })}
      >
        <div className={css({ pb: '4', mb: '2', borderBottom: '1px solid', borderColor: 'gray.100' })}>
          <span className={css({ fontWeight: 'bold', fontSize: 'lg', color: 'blue.600' })}>
            Encoraj
          </span>
        </div>

        <nav className={css({ flex: 1, display: 'flex', flexDir: 'column', gap: '1' })}>
          {visibleItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={css({
                px: '3',
                py: '2',
                borderRadius: 'md',
                fontSize: 'sm',
                fontWeight: 'medium',
                color: 'gray.700',
                textDecoration: 'none',
                _hover: { bg: 'gray.100', color: 'gray.900' },
              })}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div
          className={css({
            pt: '4',
            borderTop: '1px solid',
            borderColor: 'gray.100',
            display: 'flex',
            flexDir: 'column',
            gap: '2',
          })}
        >
          <span className={css({ fontSize: 'xs', color: 'gray.500', truncate: true })}>
            {name}
          </span>
          <LogoutButton />
        </div>
      </aside>

      {/* Conteúdo */}
      <main className={css({ flex: 1, p: '8', overflowY: 'auto' })}>
        {children}
      </main>
    </div>
  )
}
