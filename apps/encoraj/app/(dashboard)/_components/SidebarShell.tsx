'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  Users,
  UserCog,
  BarChart2,
  Settings,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import { css } from '@/styled-system/css'
import ThemeToggle from './ThemeToggle'
import LogoutButton from './LogoutButton'
import Avatar from './Avatar'
import InstallButton from './InstallButton'

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  '/':          LayoutDashboard,
  '/packages':  Package,
  '/residents': Users,
  '/users':     UserCog,
  '/reports':   BarChart2,
  '/settings':  Settings,
  '/profile':   UserCircle,
}

interface NavItem {
  href: string
  label: string
}

interface SidebarShellProps {
  name: string
  role: string
  roleLabel: string
  condoName: string
  userPhoto: string | null
  condoPhoto: string | null
  visibleItems: NavItem[]
  mobileOpen: boolean
  onMobileClose: () => void
}

export default function SidebarShell({
  name,
  roleLabel,
  condoName,
  userPhoto,
  condoPhoto,
  visibleItems,
  mobileOpen,
  onMobileClose,
}: SidebarShellProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved === 'true') setCollapsed(true)
  }, [])

  // Fecha sidebar mobile ao navegar
  useEffect(() => {
    onMobileClose()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar-collapsed', String(next))
  }

  const w = collapsed ? '64px' : '220px'

  const sidebarContent = (
    <aside
      className={css({
        bg: 'white',
        borderRight: '1px solid',
        borderColor: 'gray.200',
        display: 'flex',
        flexDir: 'column',
        p: '3',
        gap: '1',
        h: 'full',
        _dark: { bg: 'gray.900', borderColor: 'gray.800' },
      })}
      style={{ width: w, transition: 'width 0.2s ease', overflow: 'hidden', flexShrink: 0 }}
    >
      {/* Condo header */}
      <div
        className={css({
          pb: '3',
          mb: '1',
          borderBottom: '1px solid',
          borderColor: 'gray.100',
          minH: '12',
          _dark: { borderColor: 'gray.800' },
        })}
      >
        {collapsed ? (
          /* Recolhido: só o botão de expandir centralizado */
          <div className={css({ display: 'flex', alignItems: 'center', justifyContent: 'center', h: 'full', pt: '1' })}>
            <button
              type="button"
              onClick={toggleCollapsed}
              title="Expandir sidebar"
              className={css({
                display: { base: 'none', lg: 'inline-flex' },
                alignItems: 'center',
                justifyContent: 'center',
                w: '8',
                h: '8',
                borderRadius: 'md',
                border: '1px solid',
                borderColor: 'gray.200',
                bg: 'transparent',
                color: 'gray.400',
                cursor: 'pointer',
                _hover: { bg: 'gray.100', color: 'gray.700' },
                _dark: { borderColor: 'gray.700', color: 'gray.500', _hover: { bg: 'gray.800', color: 'gray.200' } },
              })}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        ) : (
          /* Expandido: avatar centralizado + nome abaixo centralizado */
          <div style={{ position: 'relative' }}>
            {/* Botão recolher — desktop, canto superior direito */}
            <button
              type="button"
              onClick={toggleCollapsed}
              title="Recolher sidebar"
              className={css({
                display: { base: 'none', lg: 'inline-flex' },
                position: 'absolute',
                top: '0',
                right: '0',
                alignItems: 'center',
                justifyContent: 'center',
                w: '6',
                h: '6',
                borderRadius: 'md',
                border: '1px solid',
                borderColor: 'gray.200',
                bg: 'transparent',
                color: 'gray.400',
                cursor: 'pointer',
                _hover: { bg: 'gray.100', color: 'gray.700' },
                _dark: { borderColor: 'gray.700', color: 'gray.500', _hover: { bg: 'gray.800', color: 'gray.200' } },
              })}
            >
              <ChevronLeft size={12} />
            </button>

            {/* Botão fechar — mobile, canto superior direito */}
            <button
              type="button"
              onClick={onMobileClose}
              className={css({
                display: { base: 'inline-flex', lg: 'none' },
                position: 'absolute',
                top: '0',
                right: '0',
                alignItems: 'center',
                justifyContent: 'center',
                w: '6',
                h: '6',
                borderRadius: 'md',
                bg: 'transparent',
                color: 'gray.400',
                cursor: 'pointer',
                border: 'none',
                _hover: { bg: 'gray.100', color: 'gray.700' },
                _dark: { color: 'gray.500', _hover: { bg: 'gray.800', color: 'gray.200' } },
              })}
            >
              <X size={14} />
            </button>

            {/* Avatar centralizado */}
            <div className={css({ display: 'flex', justifyContent: 'center', mb: '2.5' })}>
              <Avatar name={condoName || 'Encoraj'} photoUrl={condoPhoto} size="xl" />
            </div>

            {/* Nome centralizado, até 3 linhas */}
            <p
              className={css({
                fontSize: 'md',
                fontWeight: 'bold',
                color: 'gray.900',
                lineHeight: '1.35',
                textAlign: 'center',
                _dark: { color: 'gray.50' },
              })}
              style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
            >
              {condoName || 'Encoraj'}
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className={css({ flex: 1, display: 'flex', flexDir: 'column', gap: '0.5' })}>
        {visibleItems.map((item) => {
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

      {/* User footer */}
      <div
        className={css({
          pt: '3',
          borderTop: '1px solid',
          borderColor: 'gray.100',
          display: 'flex',
          flexDir: 'column',
          gap: '2',
          _dark: { borderColor: 'gray.800' },
        })}
      >
        {/* User identity */}
        <div className={css({ display: 'flex', alignItems: 'center', gap: '2.5', minW: '0' })}>
          <Avatar name={name || '?'} photoUrl={userPhoto} size="sm" />
          {!collapsed && (
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <p className={css({ fontSize: 'sm', color: 'gray.700', fontWeight: 'medium', truncate: true, _dark: { color: 'gray.300' } })}>
                {name}
              </p>
              <p className={css({ fontSize: 'xs', color: 'gray.400', _dark: { color: 'gray.500' } })}>
                {roleLabel}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className={css({ display: 'flex', gap: '2', alignItems: 'center', flexWrap: 'wrap' })}>
          <ThemeToggle />
          {!collapsed && <LogoutButton />}
        </div>
        <InstallButton collapsed={collapsed} />
      </div>
    </aside>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div className={css({ display: { base: 'none', lg: 'flex' }, h: '100vh', position: 'sticky', top: '0' })}>
        {sidebarContent}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className={css({ display: { base: 'block', lg: 'none' }, position: 'fixed', inset: '0', zIndex: '40' })}
        >
          <div
            className={css({ position: 'absolute', inset: '0', bg: 'black/40' })}
            onClick={onMobileClose}
          />
          <div className={css({ position: 'absolute', top: '0', left: '0', h: 'full', zIndex: '50' })} style={{ width: '220px' }}>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}
