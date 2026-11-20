'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Briefcase,
  Building2,
  LayoutDashboard,
  Package,
  Users,
  UserCog,
  BarChart2,
  Settings,
  UserCircle,
  Bug,
  Sparkles,
  ShieldCheck,
  History,
} from 'lucide-react'
import { css } from '@/styled-system/css'

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  '/':          LayoutDashboard,
  '/packages':  Package,
  '/residents': Users,
  '/users':     UserCog,
  '/reports':   BarChart2,
  '/settings':  Settings,
  '/profile':   UserCircle,
  '/condos':    Briefcase,
  '/admin/condos': Building2,
  '/admin/errors': Bug,
  '/admin/ai':     Sparkles,
  '/admin/permissions': ShieldCheck,
  '/admin/releases': History,
}

export interface NavItem {
  href: string
  label: string
}

/** Links do menu (já filtrados pelas permissões no layout), com o ativo destacado. */
export default function SidebarNav({ items, collapsed }: { items: NavItem[]; collapsed: boolean }) {
  const pathname = usePathname()

  return (
    <nav className={css({ flex: 1, display: 'flex', flexDir: 'column', gap: '0.5' })}>
      {items.map((item) => {
        const Icon = ICON_MAP[item.href] ?? LayoutDashboard
        const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '2.5',
              px: '2.5',
              py: '2',
              borderRadius: 'md',
              fontSize: 'sm',
              fontWeight: 'medium',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              color: isActive ? 'blue.700' : 'gray.700',
              bg: isActive ? 'blue.50' : 'transparent',
              _hover: { bg: isActive ? 'blue.100' : 'gray.100', color: isActive ? 'blue.700' : 'gray.900' },
              _dark: {
                color: isActive ? 'blue.300' : 'gray.300',
                bg: isActive ? 'blue.950' : 'transparent',
                _hover: { bg: isActive ? 'blue.900' : 'gray.800', color: isActive ? 'blue.300' : 'gray.100' },
              },
            })}
          >
            <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        )
      })}
    </nav>
  )
}
