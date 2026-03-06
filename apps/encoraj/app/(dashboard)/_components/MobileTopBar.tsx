'use client'

import { Menu } from 'lucide-react'
import { css } from '@/styled-system/css'
import Avatar from './Avatar'

interface MobileTopBarProps {
  condoName: string
  condoPhoto: string | null
  onOpen: () => void
}

export default function MobileTopBar({ condoName, condoPhoto, onOpen }: MobileTopBarProps) {
  return (
    <div
      className={css({
        display: { base: 'flex', lg: 'none' },
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        h: '14',
        alignItems: 'center',
        px: '4',
        gap: '3',
        bg: 'white',
        borderBottom: '1px solid',
        borderColor: 'gray.200',
        zIndex: '30',
        _dark: { bg: 'gray.900', borderColor: 'gray.800' },
      })}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label="Abrir menu"
        className={css({
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          w: '9',
          h: '9',
          borderRadius: 'md',
          border: 'none',
          bg: 'transparent',
          color: 'gray.600',
          cursor: 'pointer',
          _hover: { bg: 'gray.100', color: 'gray.900' },
          _dark: { color: 'gray.400', _hover: { bg: 'gray.800', color: 'gray.100' } },
        })}
      >
        <Menu size={20} />
      </button>

      <Avatar name={condoName || 'Encoraj'} photoUrl={condoPhoto} size="sm" />

      <span className={css({ fontSize: 'sm', fontWeight: 'semibold', color: 'gray.800', truncate: true, _dark: { color: 'gray.100' } })}>
        {condoName || 'Encoraj'}
      </span>
    </div>
  )
}
