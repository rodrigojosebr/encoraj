'use client'

import { useEffect } from 'react'
import { css } from '@/styled-system/css'
import { Button } from '@encoraj/ui'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className={css({ display: 'flex', flexDir: 'column', alignItems: 'center', justifyContent: 'center', gap: '4', py: '20', textAlign: 'center' })}>
      <h2 className={css({ fontSize: 'xl', fontWeight: 'bold', color: 'gray.900', _dark: { color: 'gray.50' } })}>
        Algo deu errado
      </h2>
      <p className={css({ color: 'gray.500', _dark: { color: 'gray.400' }, maxW: '400px' })}>
        Ocorreu um erro inesperado ao carregar esta página.
      </p>
      <Button intent="secondary" onClick={reset}>
        Tentar novamente
      </Button>
    </div>
  )
}
