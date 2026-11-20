'use client'

import { useState } from 'react'
import { Alert, Button, PasswordField } from '@encoraj/ui'
import { PASSWORD_MIN, PASSWORD_MIN_HINT } from '@/lib/auth/password-rules'
import { css } from '@/styled-system/css'

export default function ChangePasswordForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const form = new FormData(e.currentTarget)
    const newPassword = form.get('new_password')
    if (newPassword !== form.get('confirm_password')) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/users/me/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: form.get('current_password'), new_password: newPassword }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Não foi possível trocar a senha.')
        setLoading(false)
        return
      }
      // Recarga completa, não router.push: a sessão mudou e o layout do dashboard (que é
      // compartilhado entre as telas) precisa ser renderizado de novo com o cookie novo
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- troca de sessão (ver CLAUDE.md)
      window.location.href = '/'
    } catch {
      setError('Erro de conexão. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={css({ display: 'flex', flexDir: 'column', gap: '4' })}>
      {error && <Alert variant="error">{error}</Alert>}

      <PasswordField label="Senha recebida" name="current_password" required autoComplete="current-password" />
      <PasswordField
        label="Nova senha"
        name="new_password"
        required
        minLength={PASSWORD_MIN}
        placeholder={PASSWORD_MIN_HINT}
        autoComplete="new-password"
      />
      <PasswordField label="Confirmar nova senha" name="confirm_password" required minLength={PASSWORD_MIN} autoComplete="new-password" />

      <Button type="submit" loading={loading} style={{ width: '100%' }}>
        Salvar e entrar
      </Button>
      <a
        href="/api/auth/logout"
        className={css({ fontSize: 'sm', textAlign: 'center', color: 'gray.500', textDecoration: 'none', _hover: { textDecoration: 'underline' }, _dark: { color: 'gray.400' } })}
      >
        Sair
      </a>
    </form>
  )
}
