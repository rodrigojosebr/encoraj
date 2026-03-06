'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { css } from '@/styled-system/css'

export default function DeletedToggle() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const checked = searchParams.get('deleted') === '1'

  function toggle() {
    const params = new URLSearchParams(searchParams.toString())
    if (checked) {
      params.delete('deleted')
    } else {
      params.set('deleted', '1')
      params.delete('q')
    }
    router.push(`/residents?${params.toString()}`)
  }

  return (
    <label
      className={css({
        display: 'flex',
        alignItems: 'center',
        gap: '2',
        cursor: 'pointer',
        userSelect: 'none',
      })}
    >
      <span className={css({ fontSize: 'sm', color: 'gray.600', _dark: { color: 'gray.400' } })}>
        Ver excluídos
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={toggle}
        className={css({
          position: 'relative',
          w: '10',
          h: '6',
          borderRadius: 'full',
          border: 'none',
          cursor: 'pointer',
          transition: 'background 0.2s ease',
          bg: checked ? 'red.500' : 'gray.300',
          _dark: { bg: checked ? 'red.600' : 'gray.600' },
          flexShrink: 0,
          p: '0',
        })}
      >
        <span
          className={css({
            position: 'absolute',
            top: '3px',
            left: checked ? '18px' : '3px',
            w: '18px',
            h: '18px',
            borderRadius: 'full',
            bg: 'white',
            transition: 'left 0.2s ease',
            boxShadow: 'sm',
          })}
        />
      </button>
    </label>
  )
}
