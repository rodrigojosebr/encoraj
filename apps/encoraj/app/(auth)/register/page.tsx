'use client'

import { useState } from 'react'
import Link from 'next/link'
import { css } from '@/styled-system/css'
import { Button, FormField } from '@encoraj/ui'

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const body = {
      condoName: form.get('condoName') as string,
      name: form.get('name') as string,
      email: form.get('email') as string,
      password: form.get('password') as string,
    }

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Erro ao criar conta')
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
        _dark: { bg: 'gray.950' },
      })}
    >
      <div
        className={css({
          w: 'full',
          maxW: '440px',
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
            Criar conta
          </h1>
          <p className={css({ fontSize: 'sm', color: 'gray.500', _dark: { color: 'gray.400' } })}>
            Configure o Encoraj para o seu condomínio
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className={css({ display: 'flex', flexDir: 'column', gap: '4' })}
        >
          <FormField
            label="Nome do condomínio"
            name="condoName"
            required
            minLength={3}
            placeholder="Ex: Residencial Park"
            autoComplete="off"
          />

          <FormField
            label="Seu nome"
            name="name"
            required
            minLength={2}
            placeholder="Nome completo"
            autoComplete="name"
          />

          <FormField
            label="Email"
            type="email"
            name="email"
            required
            placeholder="admin@condominio.com"
            autoComplete="email"
          />

          <div className={css({ position: 'relative' })}>
            <FormField
              label="Senha"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className={css({
                position: 'absolute',
                right: '3',
                bottom: '9px',
                color: 'gray.400',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                p: '0',
                lineHeight: '1',
                _hover: { color: 'gray.600' },
              })}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {error && (
            <p className={css({ fontSize: 'sm', color: 'red.600' })}>{error}</p>
          )}

          <Button type="submit" loading={loading} style={{ width: '100%' }}>
            Criar conta
          </Button>
        </form>

        <p className={css({ fontSize: 'sm', color: 'gray.500', textAlign: 'center', _dark: { color: 'gray.400' } })}>
          Já tem conta?{' '}
          <Link
            href="/login"
            className={css({ color: 'blue.600', textDecoration: 'none', _hover: { textDecoration: 'underline' }, _dark: { color: 'blue.400' } })}
          >
            Entrar
          </Link>
        </p>
      </div>
    </main>
  )
}
