import Link from 'next/link'
import { css } from '@/styled-system/css'
import { Button } from '@encoraj/ui'

export default function NotFound() {
  return (
    <div className={css({ minH: '100vh', display: 'flex', flexDir: 'column', alignItems: 'center', justifyContent: 'center', gap: '4', textAlign: 'center', px: '4', bg: 'gray.50', _dark: { bg: 'gray.950' } })}>
      <p className={css({ fontSize: '7xl', fontWeight: 'bold', color: 'gray.200', _dark: { color: 'gray.700' }, lineHeight: '1' })}>
        404
      </p>
      <h1 className={css({ fontSize: '2xl', fontWeight: 'bold', color: 'gray.900', _dark: { color: 'gray.50' } })}>
        Página não encontrada
      </h1>
      <p className={css({ color: 'gray.500', _dark: { color: 'gray.400' }, maxW: '360px' })}>
        O endereço que você tentou acessar não existe ou foi removido.
      </p>
      <Link href="/">
        <Button intent="primary">Voltar ao início</Button>
      </Link>
    </div>
  )
}
