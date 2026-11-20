'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, FormField, Alert, PasswordField, useToast } from '@encoraj/ui'
import { PASSWORD_MIN, PASSWORD_MIN_HINT } from '@/lib/auth/password-rules'
import { css } from '@/styled-system/css'

interface RoleOption {
  value: string
  label: string
}

interface UserFormProps {
  id?: string
  defaultValues?: { name: string; email: string; roles: string[] }
  roleOptions: RoleOption[]
  /** Quem já tem um perfil que a tela não atribui (administradora, super admin) pode ficar sem perfil de condomínio */
  rolesOptional?: boolean
}

export default function UserForm({ id, defaultValues, roleOptions, rolesOptional = false }: UserFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const roles = form.getAll('roles') as string[]
    if (roles.length === 0 && !rolesOptional) {
      setError('Escolha pelo menos um perfil.')
      setLoading(false)
      return
    }
    const body: Record<string, string | string[]> = {
      name: form.get('name') as string,
      email: form.get('email') as string,
      roles,
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
        toast({ variant: 'success', message: id ? 'Usuário atualizado!' : 'Usuário cadastrado!' })
        router.push('/users')
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
          Perfis {!rolesOptional && <span className={css({ color: 'red.500' })}>*</span>}
        </label>
        <div className={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
          {roleOptions.map((r) => (
            <label key={r.value} className={css({ display: 'flex', alignItems: 'center', gap: '2', fontSize: 'sm', color: 'gray.800', cursor: 'pointer', _dark: { color: 'gray.200' } })}>
              <input type="checkbox" name="roles" value={r.value} defaultChecked={defaultValues?.roles.includes(r.value) ?? false} />
              {r.label}
            </label>
          ))}
        </div>
        <span className={css({ fontSize: 'xs', color: 'gray.500', _dark: { color: 'gray.400' } })}>
          As permissões se somam: marque todos os papéis que a pessoa exerce.
        </span>
      </div>

      <PasswordField
        label={id ? 'Nova senha (deixe em branco para manter)' : 'Senha'}
        name="password"
        required={!id}
        minLength={PASSWORD_MIN}
        placeholder={id ? undefined : PASSWORD_MIN_HINT}
        autoComplete="new-password"
        hint="A pessoa terá que trocar esta senha ao entrar."
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
