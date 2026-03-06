'use client'

import { useState } from 'react'
import { css } from '@/styled-system/css'
import SidebarShell from './SidebarShell'
import MobileTopBar from './MobileTopBar'

interface NavItem {
  href: string
  label: string
}

interface DashboardShellProps {
  name: string
  role: string
  roleLabel: string
  condoName: string
  userPhoto: string | null
  condoPhoto: string | null
  visibleItems: NavItem[]
  children: React.ReactNode
}

export default function DashboardShell({
  name,
  role,
  roleLabel,
  condoName,
  userPhoto,
  condoPhoto,
  visibleItems,
  children,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className={css({ display: 'flex', minH: '100vh', bg: 'gray.50', _dark: { bg: 'gray.950' } })}>
      <SidebarShell
        name={name}
        role={role}
        roleLabel={roleLabel}
        condoName={condoName}
        userPhoto={userPhoto}
        condoPhoto={condoPhoto}
        visibleItems={visibleItems}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className={css({ flex: 1, display: 'flex', flexDir: 'column', minW: '0' })}>
        <MobileTopBar condoName={condoName} condoPhoto={condoPhoto} onOpen={() => setMobileOpen(true)} />

        <main
          className={css({
            flex: 1,
            p: { base: '4', md: '6', lg: '8' },
            pt: { base: '20', lg: '8' },
            overflowY: 'auto',
            _dark: { bg: 'gray.950' },
          })}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
