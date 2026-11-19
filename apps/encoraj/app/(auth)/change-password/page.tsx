import { redirect } from 'next/navigation'
import { css } from '@/styled-system/css'
import { getSessionForPasswordChange } from '@/lib/auth/session'
import ChangePasswordForm from './_components/ChangePasswordForm'

export const metadata = { title: 'Defina sua senha — Encoraj' }

/**
 * Primeiro acesso (ou senha redefinida por um administrador): a pessoa só segue depois
 * de trocar a senha que outra pessoa definiu. Fora do layout do dashboard, que é quem
 * manda para cá.
 */
export default async function ChangePasswordPage() {
  const session = await getSessionForPasswordChange()
  if (!session) redirect('/api/auth/logout')
  if (!session.mustChangePassword) redirect('/')

  return (
    <main className={css({ minH: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bg: 'gray.50', p: '4', _dark: { bg: 'gray.950' } })}>
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
        <div className={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
          <h1 className={css({ fontSize: 'xl', fontWeight: 'bold', color: 'gray.900', _dark: { color: 'gray.50' } })}>Defina sua senha</h1>
          <p className={css({ fontSize: 'sm', color: 'gray.500', _dark: { color: 'gray.400' } })}>
            Olá, {session.userName}. A senha que você recebeu foi criada por outra pessoa. Antes de continuar, escolha uma
            senha que só você conheça.
          </p>
        </div>
        <ChangePasswordForm />
      </div>
    </main>
  )
}
