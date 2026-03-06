'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, FormField, Alert } from '@encoraj/ui'
import { css } from '@/styled-system/css'

interface RoleOption {
  value: string
  label: string
}

interface UserFormProps {
  id?: string
  defaultValues?: { name: string; email: string; role: string }
  roleOptions: RoleOption[]
}

export default function UserForm({ id, defaultValues, roleOptions }: UserFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const body: Record<string, string> = {
      name: form.get('name') as string,
      email: form.get('email') as string,
      role: form.get('role') as string,
    }
    const password = form.get('password') as string
    if (password) body.password = password

    try {
      const res = await fetch(id ? `/api/users/${id}` : '/api/users', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        window.location.href = '/users'
      } else {
        const data = await res.json()
        setError(data.error ?? 'Erro ao salvar usuário')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={css({ display: 'flex', flexDir: 'column', gap: '4', maxW: '480px' })}
    >
      {error && <Alert variant="error">{error}</Alert>}

      <FormField
        label="Nome"
        name="name"
        required
        minLength={2}
        defaultValue={defaultValues?.name}
        placeholder="Nome completo"
      />

      <FormField
        label="E-mail"
        name="email"
        type="email"
        required
        defaultValue={defaultValues?.email}
        placeholder="email@exemplo.com"
      />

      <div className={css({ display: 'flex', flexDir: 'column', gap: '1.5' })}>
        <label className={css({ fontSize: 'sm', fontWeight: 'medium', color: 'gray.700', _dark: { color: 'gray.300' } })}>
          Perfil <span className={css({ color: 'red.500' })}>*</span>
        </label>
        <select
          name="role"
          required
          defaultValue={defaultValues?.role ?? 'porteiro'}
          className={css({
            w: 'full',
            px: '3',
            py: '2',
            border: '1px solid',
            borderColor: 'gray.300',
            borderRadius: 'md',
            fontSize: 'sm',
            bg: 'white',
            color: 'gray.900',
            outline: 'none',
            cursor: 'pointer',
            _focus: { borderColor: 'blue.500', ring: '1px', ringColor: 'blue.500' },
            _dark: { bg: 'gray.900', borderColor: 'gray.700', color: 'gray.100' },
          })}
        >
          {roleOptions.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      <FormField
        label={id ? 'Nova senha (deixe em branco para manter)' : 'Senha'}
        name="password"
        type="password"
        required={!id}
        minLength={6}
        placeholder={id ? '••••••••' : 'Mínimo 6 caracteres'}
        autoComplete={id ? 'new-password' : 'new-password'}
      />

      <div className={css({ display: 'flex', gap: '3', pt: '2' })}>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando…' : id ? 'Salvar alterações' : 'Cadastrar usuário'}
        </Button>
        <Button type="button" variant="ghost" intent="secondary" onClick={() => router.push('/users')}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
