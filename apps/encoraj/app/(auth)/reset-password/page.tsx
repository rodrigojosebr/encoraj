'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { css } from '@/styled-system/css'
import { Button, PasswordField } from '@encoraj/ui'
import { PASSWORD_MIN, PASSWORD_MIN_HINT } from '@/lib/auth/password-rules'
import AuthHeader from '../_components/AuthHeader'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erro ao redefinir senha.')
        return
      }

      setDone(true)
      setTimeout(() => router.push('/login'), 2500)
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className={css({ display: 'flex', flexDir: 'column', gap: '4' })}>
        <p className={css({ fontSize: 'sm', color: 'red.600' })}>
          Link inválido. Solicite um novo link de redefinição.
        </p>
        <Link href="/forgot-password">
          <Button intent="secondary" style={{ width: '100%' }}>Solicitar novo link</Button>
        </Link>
      </div>
    )
  }

  if (done) {
    return (
      <p className={css({ fontSize: 'sm', color: 'green.700', bg: 'green.50', border: '1px solid', borderColor: 'green.200', borderRadius: 'lg', p: '4', _dark: { color: 'green.300', bg: 'green.950', borderColor: 'green.800' } })}>
        Senha redefinida com sucesso! Redirecionando para o login…
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={css({ display: 'flex', flexDir: 'column', gap: '4' })}>
      <PasswordField
        label="Nova senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={PASSWORD_MIN}
        placeholder={PASSWORD_MIN_HINT}
        autoComplete="new-password"
      />
      <PasswordField
        label="Confirmar senha"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        required
        minLength={PASSWORD_MIN}
        autoComplete="new-password"
      />

      {error && (
        <p className={css({ fontSize: 'sm', color: 'red.600' })}>{error}</p>
      )}

      <Button type="submit" loading={loading} style={{ width: '100%' }}>
        Redefinir senha
      </Button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <>
      <AuthHeader title="Nova senha">Escolha uma senha com no mínimo {PASSWORD_MIN} caracteres.</AuthHeader>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </>
  )
}
