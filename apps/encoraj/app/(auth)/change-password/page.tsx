import { redirect } from 'next/navigation'
import { getSessionForPasswordChange } from '@/lib/auth/session'
import AuthHeader from '../_components/AuthHeader'
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
    <>
      <AuthHeader title="Defina sua senha">
        Olá, {session.userName}. A senha que você recebeu foi criada por outra pessoa. Antes de continuar, escolha uma
        senha que só você conheça.
      </AuthHeader>
      <ChangePasswordForm />
    </>
  )
}
