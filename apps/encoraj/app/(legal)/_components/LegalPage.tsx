import Link from 'next/link'
import { css } from '@/styled-system/css'
import { formatTermsVersion, legalInfo } from '@/lib/legal/terms'

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  const { companyName, companyDoc } = legalInfo()

  return (
    <main className={css({ minH: '100vh', bg: 'gray.50', py: '10', px: '4', _dark: { bg: 'gray.950' } })}>
      <article
        className={css({
          maxW: '760px',
          mx: 'auto',
          bg: 'white',
          border: '1px solid',
          borderColor: 'gray.200',
          borderRadius: 'xl',
          p: { base: '5', md: '10' },
          display: 'flex',
          flexDir: 'column',
          gap: '5',
          color: 'gray.800',
          fontSize: 'sm',
          lineHeight: '1.7',
          _dark: { bg: 'gray.900', borderColor: 'gray.700', color: 'gray.200' },
        })}
      >
        <header className={css({ display: 'flex', flexDir: 'column', gap: '1' })}>
          <h1 className={css({ fontSize: '2xl', fontWeight: 'bold', color: 'gray.900', _dark: { color: 'gray.50' } })}>
            {title}
          </h1>
          <p className={css({ fontSize: 'xs', color: 'gray.500', _dark: { color: 'gray.400' } })}>
            {companyName}
            {companyDoc ? ` · ${companyDoc}` : ''} · Versão de {formatTermsVersion()}
          </p>
        </header>

        {children}

        <footer
          className={css({
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4',
            pt: '4',
            borderTop: '1px solid',
            borderColor: 'gray.200',
            fontSize: 'xs',
            _dark: { borderColor: 'gray.700' },
          })}
        >
          <Link href="/termos" className={linkCss}>Termos de Uso</Link>
          <Link href="/privacidade" className={linkCss}>Política de Privacidade</Link>
          <Link href="/login" className={linkCss}>Entrar</Link>
        </footer>
      </article>
    </main>
  )
}

export const linkCss = css({
  color: 'blue.600',
  textDecoration: 'none',
  _hover: { textDecoration: 'underline' },
  _dark: { color: 'blue.400' },
})

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
      <h2 className={css({ fontSize: 'md', fontWeight: 'semibold', color: 'gray.900', mt: '2', _dark: { color: 'gray.50' } })}>
        {title}
      </h2>
      {children}
    </section>
  )
}

export function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className={css({ pl: '5', listStyleType: 'disc', display: 'flex', flexDir: 'column', gap: '1' })}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}
