'use client'

import { useState } from 'react'
import Link from 'next/link'
import { css } from '@/styled-system/css'
import { Button, FormField } from '@encoraj/ui'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Erro ao processar solicitação.')
        return
      }

      setSent(true)
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
          p: '8',
          display: 'flex',
          flexDir: 'column',
          gap: '6',
          _dark: { bg: 'gray.900', borderColor: 'gray.700' },
        })}
      >
        <div className={css({ display: 'flex', flexDir: 'column', gap: '1' })}>
          <h1 className={css({ fontSize: '2xl', fontWeight: 'bold', color: 'gray.900', _dark: { color: 'gray.50' } })}>
            Esqueceu a senha?
          </h1>
          <p className={css({ fontSize: 'sm', color: 'gray.500', _dark: { color: 'gray.400' } })}>
            Informe seu email e enviaremos um link para redefinir.
          </p>
        </div>

        {sent ? (
          <div className={css({ display: 'flex', flexDir: 'column', gap: '4' })}>
            <p className={css({ fontSize: 'sm', color: 'green.700', bg: 'green.50', border: '1px solid', borderColor: 'green.200', borderRadius: 'lg', p: '4', _dark: { color: 'green.300', bg: 'green.950', borderColor: 'green.800' } })}>
              Se existe uma conta com esse email, você receberá as instruções em instantes. Verifique também a caixa de spam.
            </p>
            <Link href="/login">
              <Button intent="secondary" style={{ width: '100%' }}>
                Voltar ao login
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={css({ display: 'flex', flexDir: 'column', gap: '4' })}>
            <FormField
              label="Email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            {error && (
              <p className={css({ fontSize: 'sm', color: 'red.600' })}>{error}</p>
            )}

            <Button type="submit" loading={loading} style={{ width: '100%' }}>
              Enviar link
            </Button>

            <Link
              href="/login"
              className={css({ fontSize: 'sm', color: 'gray.500', textAlign: 'center', textDecoration: 'none', _hover: { color: 'gray.700' }, _dark: { color: 'gray.400', _hover: { color: 'gray.200' } } })}
            >
              Voltar ao login
            </Link>
          </form>
        )}
      </div>
    </main>
  )
}
