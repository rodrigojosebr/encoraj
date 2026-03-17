'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { css } from '@/styled-system/css'

const inputCss = css({
  px: '3', py: '1.5', fontSize: 'sm', borderRadius: 'md',
  border: '1px solid', borderColor: 'gray.300',
  bg: 'white', color: 'gray.700',
  _dark: { bg: 'gray.800', borderColor: 'gray.600', color: 'gray.200' },
})

const labelCss = css({
  fontSize: 'xs', fontWeight: 'semibold', color: 'gray.500',
  textTransform: 'uppercase', letterSpacing: 'wide',
  _dark: { color: 'gray.400' },
})

interface Option { value: string; label: string }

interface ReportsFilterBarProps {
  statusOptions: Option[]
  status?: string
  from?: string
  to?: string
  q?: string
}

export default function ReportsFilterBar({ statusOptions, status, from, to, q }: ReportsFilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [statusVal, setStatusVal] = useState(status ?? '')
  const [fromVal, setFromVal] = useState(from ?? '')
  const [toVal, setToVal] = useState(to ?? '')

  // Refs para saber qual foi o último valor que nós mesmos navegamos
  const lastStatus = useRef(status ?? '')
  const lastFrom = useRef(from ?? '')
  const lastTo = useRef(to ?? '')

  // Sincroniza só quando veio de fora (ex: clicar num card de filtro ou "Limpar")
  useEffect(() => {
    const next = status ?? ''
    if (next !== lastStatus.current) { setStatusVal(next); lastStatus.current = next }
  }, [status])

  useEffect(() => {
    const next = from ?? ''
    if (next !== lastFrom.current) { setFromVal(next); lastFrom.current = next }
  }, [from])

  useEffect(() => {
    const next = to ?? ''
    if (next !== lastTo.current) { setToVal(next); lastTo.current = next }
  }, [to])

  function navigate(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, val] of Object.entries(updates)) {
      if (val) { params.set(key, val) } else { params.delete(key) }
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  const hasFilter = !!(statusVal || fromVal || toVal || q)

  return (
    <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '4', alignItems: 'flex-end' })}>
      <div className={css({ display: 'flex', flexDir: 'column', gap: '1' })}>
        <label className={labelCss}>Status</label>
        <select
          value={statusVal}
          className={inputCss}
          onChange={(e) => {
            const next = e.target.value
            setStatusVal(next)
            lastStatus.current = next
            navigate({ status: next })
          }}
        >
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className={css({ display: 'flex', flexDir: 'column', gap: '1' })}>
        <label className={labelCss}>De</label>
        <input
          type="date"
          value={fromVal}
          className={inputCss}
          onChange={(e) => {
            const next = e.target.value
            setFromVal(next)
            lastFrom.current = next
            navigate({ from: next })
          }}
        />
      </div>

      <div className={css({ display: 'flex', flexDir: 'column', gap: '1' })}>
        <label className={labelCss}>Até</label>
        <input
          type="date"
          value={toVal}
          className={inputCss}
          onChange={(e) => {
            const next = e.target.value
            setToVal(next)
            lastTo.current = next
            navigate({ to: next })
          }}
        />
      </div>

      {hasFilter && (
        <Link
          href="/reports"
          className={css({
            px: '4', py: '1.5', fontSize: 'sm', fontWeight: 'medium',
            borderRadius: 'md', bg: 'gray.100', color: 'gray.600',
            textDecoration: 'none', alignSelf: 'flex-end',
            _hover: { bg: 'gray.200' },
            _dark: { bg: 'gray.800', color: 'gray.300', _hover: { bg: 'gray.700' } },
          })}
        >
          Limpar
        </Link>
      )}
    </div>
  )
}
