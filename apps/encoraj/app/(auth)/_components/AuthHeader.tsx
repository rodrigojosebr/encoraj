import { css } from '@/styled-system/css'

/** Título e texto de apoio do cartão das telas de `(auth)`. */
export default function AuthHeader({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '1' })}>
      <h1 className={css({ fontSize: '2xl', fontWeight: 'bold', color: 'gray.900', _dark: { color: 'gray.50' } })}>{title}</h1>
      <p className={css({ fontSize: 'sm', color: 'gray.500', _dark: { color: 'gray.400' } })}>{children}</p>
    </div>
  )
}
