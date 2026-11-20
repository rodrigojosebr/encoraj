'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useLocalStorage } from '../_lib/use-local-storage'
import { usePhotoUpdates } from '../_lib/use-photo-upload'
import { css } from '@/styled-system/css'
import SidebarHeader from './SidebarHeader'
import SidebarNav, { type NavItem } from './SidebarNav'
import SidebarFooter from './SidebarFooter'

interface SidebarShellProps {
  name: string
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
  userPhoto: initialUserPhoto,
  condoPhoto: initialCondoPhoto,
  visibleItems,
  mobileOpen,
  onMobileClose,
}: SidebarShellProps) {
  const pathname = usePathname()
  const [savedCollapsed, setSavedCollapsed] = useLocalStorage('sidebar-collapsed')
  const collapsed = savedCollapsed === 'true'
  const userPhoto = usePhotoUpdates('user-photo-updated', initialUserPhoto)
  const condoPhoto = usePhotoUpdates('condo-photo-updated', initialCondoPhoto)

  // Fecha sidebar mobile ao navegar
  useEffect(() => {
    onMobileClose()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  function toggleCollapsed() {
    setSavedCollapsed(String(!collapsed))
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
      <SidebarHeader
        collapsed={collapsed}
        condoName={condoName}
        condoPhoto={condoPhoto}
        onToggleCollapsed={toggleCollapsed}
        onMobileClose={onMobileClose}
      />
      <SidebarNav items={visibleItems} collapsed={collapsed} />
      <SidebarFooter collapsed={collapsed} name={name} roleLabel={roleLabel} userPhoto={userPhoto} />
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
