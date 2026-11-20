'use client'

import { css } from '@/styled-system/css'
import ThemeToggle from './ThemeToggle'
import LogoutButton from './LogoutButton'
import Avatar from './Avatar'
import InstallButton from './InstallButton'

interface SidebarFooterProps {
  collapsed: boolean
  name: string
  roleLabel: string
  userPhoto: string | null
}

/** Rodapé da barra lateral: quem está logado, tema, sair e instalar o app. */
export default function SidebarFooter({ collapsed, name, roleLabel, userPhoto }: SidebarFooterProps) {
  return (
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
      {collapsed ? (
        /* Collapsed: tudo empilhado e centralizado */
        <div className={css({ display: 'flex', flexDir: 'column', alignItems: 'center', gap: '2' })}>
          <Avatar name={name || '?'} photoUrl={userPhoto} size="sm" />
          <ThemeToggle />
          <LogoutButton iconOnly />
          <InstallButton collapsed={collapsed} />
        </div>
      ) : (
        /* Expandido */
        <>
          {/* User identity + ThemeToggle na mesma linha */}
          <div className={css({ display: 'flex', alignItems: 'center', gap: '2.5', minW: '0' })}>
            <Avatar name={name || '?'} photoUrl={userPhoto} size="sm" />
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <p className={css({ fontSize: 'sm', color: 'gray.700', fontWeight: 'medium', truncate: true, _dark: { color: 'gray.300' } })}>
                {name}
              </p>
              <p className={css({ fontSize: 'xs', color: 'gray.400', _dark: { color: 'gray.500' } })}>
                {roleLabel}
              </p>
            </div>
            <ThemeToggle />
          </div>

          {/* Logout — linha separada, alinhado à esquerda */}
          <div className={css({ alignSelf: 'flex-start' })}>
            <LogoutButton />
          </div>
          <InstallButton collapsed={collapsed} />
        </>
      )}
    </div>
  )
}
