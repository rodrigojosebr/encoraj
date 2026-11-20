import { css } from '@/styled-system/css'

/** Moldura das telas sem login (entrar, esqueci, redefinir, primeiro acesso): cartão centralizado. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      className={css({
        minH: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bg: 'gray.50',
        p: '4',
        _dark: { bg: 'gray.950' },
      })}
    >
      <div
        className={css({
          w: 'full',
          maxW: '400px',
          bg: 'white',
          borderRadius: 'xl',
          border: '1px solid',
          borderColor: 'gray.200',
          p: { base: '6', md: '8' },
          display: 'flex',
          flexDir: 'column',
          gap: '6',
          _dark: { bg: 'gray.900', borderColor: 'gray.700' },
        })}
      >
        {children}
      </div>
    </main>
  )
}
