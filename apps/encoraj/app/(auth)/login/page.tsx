'use client'

import { useState } from 'react'
import { css } from '@/styled-system/css'
import { Button, FormField } from '@encoraj/ui'

export default function LoginPage() {
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

      window.location.href = '/'
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      className={css({
        minH: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bg: 'gray.50',
        p: '4',
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
          p: '8',
          display: 'flex',
          flexDir: 'column',
          gap: '6',
        })}
      >
        <div className={css({ display: 'flex', flexDir: 'column', gap: '1' })}>
          <h1 className={css({ fontSize: '2xl', fontWeight: 'bold', color: 'gray.900' })}>
            Encoraj
          </h1>
          <p className={css({ fontSize: 'sm', color: 'gray.500' })}>
            Sistema de gestão de encomendas
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className={css({ display: 'flex', flexDir: 'column', gap: '4' })}
        >
          <FormField
            label="Email"
            type="email"
            placeholder="porteiro@condominio.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <FormField
            label="Senha"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {error && (
            <p className={css({ fontSize: 'sm', color: 'red.600' })}>{error}</p>
          )}

          <Button type="submit" loading={loading} style={{ width: '100%' }}>
            Entrar
          </Button>
        </form>
      </div>
    </main>
  )
}
