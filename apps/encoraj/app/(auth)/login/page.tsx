'use client'

import { safeNextPath } from '@/lib/auth/safe-next'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { css } from '@/styled-system/css'
import { Button, FormField, PasswordField } from '@encoraj/ui'
import AuthHeader from '../_components/AuthHeader'

function LoginForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Erro ao fazer login')
        return
      }

      const next = searchParams.get('next')
      window.location.href = safeNextPath(next)
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <AuthHeader title="Encoraj">Sistema de gestão de encomendas</AuthHeader>

      <form onSubmit={handleSubmit} className={css({ display: 'flex', flexDir: 'column', gap: '4' })}>
        <FormField
          label="Email"
          type="email"
          placeholder="porteiro@condominio.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <PasswordField
          label="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        {error && <p className={css({ fontSize: 'sm', color: 'red.600' })}>{error}</p>}

        <Button type="submit" loading={loading} style={{ width: '100%' }}>
          Entrar
        </Button>

        {/* TODO: habilitar quando SMTP estiver configurado (e voltar o `import Link from 'next/link'`)
        <Link
          href="/forgot-password"
          className={css({ fontSize: 'sm', color: 'gray.500', textAlign: 'center', textDecoration: 'none', _hover: { color: 'blue.600' }, _dark: { color: 'gray.400', _hover: { color: 'blue.400' } } })}
        >
          Esqueci minha senha
        </Link>
        */}
      </form>
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
