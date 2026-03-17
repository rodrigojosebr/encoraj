'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Button } from '@encoraj/ui'
import { css } from '@/styled-system/css'

interface LogoutButtonProps {
  iconOnly?: boolean
}

export default function LogoutButton({ iconOnly }: LogoutButtonProps) {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/login')
    router.refresh()
  }

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={handleLogout}
        title="Sair"
        className={css({
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          w: '8',
          h: '8',
          borderRadius: 'md',
          border: '1px solid',
          borderColor: 'gray.200',
          bg: 'transparent',
          color: 'gray.500',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          _hover: { bg: 'red.50', color: 'red.600', borderColor: 'red.200' },
          _dark: {
            borderColor: 'gray.700',
            color: 'gray.400',
            _hover: { bg: 'red.950', color: 'red.400', borderColor: 'red.800' },
          },
        })}
      >
        <LogOut size={16} />
      </button>
    )
  }

  return (
    <Button variant="ghost" intent="secondary" size="sm" leftIcon={<LogOut size={14} />} onClick={handleLogout}>
      Sair
    </Button>
  )
}
