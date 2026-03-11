'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { css } from '@/styled-system/css'
import { Button } from '@encoraj/ui'

const eyeOpen = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)
const eyeOff = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  autoComplete?: string
}) {
  const [show, setShow] = useState(false)
  const inputCss = css({
    w: 'full',
    px: '3',
    py: '2',
    pr: '10',
    fontSize: 'sm',
    borderRadius: 'md',
    border: '1px solid',
    borderColor: 'gray.300',
    bg: 'white',
    color: 'gray.900',
    outline: 'none',
    _focus: { borderColor: 'blue.500', ring: '2px', ringColor: 'blue.200' },
    _dark: { bg: 'gray.800', borderColor: 'gray.600', color: 'gray.100', _focus: { borderColor: 'blue.400', ringColor: 'blue.800' } },
  })
  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '1.5' })}>
      <label className={css({ fontSize: 'sm', fontWeight: 'medium', color: 'gray.700', _dark: { color: 'gray.300' } })}>
        {label}
      </label>
      <div className={css({ position: 'relative' })}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder="••••••••"
          required
          autoComplete={autoComplete}
          className={inputCss}
        />
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
          className={css({
            position: 'absolute',
            right: '3',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'gray.400',
            bg: 'none',
            border: 'none',
            p: '0',
            cursor: 'pointer',
            lineHeight: '1',
            _hover: { color: 'gray.600' },
          })}
        >
          {show ? eyeOff : eyeOpen}
        </button>
      </div>
    </div>
  )
}

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
        autoComplete="new-password"
      />
      <PasswordField
        label="Confirmar senha"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
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
            Nova senha
          </h1>
          <p className={css({ fontSize: 'sm', color: 'gray.500', _dark: { color: 'gray.400' } })}>
            Escolha uma senha com no mínimo 8 caracteres.
          </p>
        </div>

        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  )
}
