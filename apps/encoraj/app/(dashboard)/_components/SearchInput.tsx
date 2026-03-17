'use client'

import { useEffect, useRef, useState } from 'react'
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
  const isFirstRender = useRef(true)

  // Sincroniza quando q muda na URL por fora (ex: clicar num filtro de status)
  useEffect(() => {
    const urlQ = searchParams.get('q') ?? ''
    setValue(urlQ)
  }, [searchParams])

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (timer.current) clearTimeout(timer.current)

    // Dispara se >= 3 chars ou se limpou o campo
    if (value.length >= 3 || value.length === 0) {
      timer.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString())
        if (value) {
          params.set('q', value)
        } else {
          params.delete('q')
        }
        router.push(`${pathname}?${params.toString()}`)
      }, 300)
    }

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
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
