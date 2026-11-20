'use client'

import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { css } from '@/styled-system/css'
import Avatar from './Avatar'

interface SidebarHeaderProps {
  collapsed: boolean
  condoName: string
  condoPhoto: string | null
  onToggleCollapsed: () => void
  onMobileClose: () => void
}

/** Topo da barra lateral: foto e nome do condomínio, recolher (desktop) e fechar (mobile). */
export default function SidebarHeader({ collapsed, condoName, condoPhoto, onToggleCollapsed, onMobileClose }: SidebarHeaderProps) {
  return (
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
            onClick={onToggleCollapsed}
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
            onClick={onToggleCollapsed}
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
  )
}
