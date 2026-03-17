'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { css } from '@/styled-system/css'

interface SearchInputProps {
  placeholder?: string
  defaultValue?: string
}

export default function SearchInput({ placeholder, defaultValue }: SearchInputProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(defaultValue ?? '')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPushed = useRef(defaultValue ?? '')

  // Sincroniza só quando a mudança veio de fora (ex: clicar num card de filtro)
  // Se defaultValue === lastPushed, foi a nossa própria navegação — ignora
  useEffect(() => {
    const next = defaultValue ?? ''
    if (next !== lastPushed.current) {
      setValue(next)
      lastPushed.current = next
    }
  }, [defaultValue])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value
    setValue(next)

    if (timer.current) clearTimeout(timer.current)

    if (next.length >= 3 || next.length === 0) {
      timer.current = setTimeout(() => {
        if (next === lastPushed.current) return
        lastPushed.current = next

        const params = new URLSearchParams(searchParams.toString())
        if (next) {
          params.set('q', next)
        } else {
          params.delete('q')
        }
        router.push(`${pathname}?${params.toString()}`)
      }, 300)
    }
  }

  return (
    <input
      value={value}
      onChange={handleChange}
      placeholder={placeholder ?? 'Buscar…'}
      className={css({
        flex: '1',
        minW: '220px',
        px: '3',
        py: '2',
        fontSize: 'sm',
        borderRadius: 'md',
        border: '1px solid',
        borderColor: 'gray.300',
        bg: 'white',
        color: 'gray.900',
        outline: 'none',
        _placeholder: { color: 'gray.400' },
        _focus: { borderColor: 'blue.500', boxShadow: '0 0 0 3px token(colors.blue.100)' },
        _dark: {
          bg: 'gray.900',
          borderColor: 'gray.600',
          color: 'gray.100',
          _placeholder: { color: 'gray.500' },
          _focus: { borderColor: 'blue.400', boxShadow: '0 0 0 3px token(colors.blue.900)' },
        },
      })}
    />
  )
}
