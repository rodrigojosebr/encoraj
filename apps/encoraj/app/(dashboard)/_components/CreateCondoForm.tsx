'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2 } from 'lucide-react'
import { Alert, Button, FormField, PasswordField, useToast } from '@encoraj/ui'
import { PASSWORD_MIN, PASSWORD_MIN_HINT } from '@/lib/auth/password-rules'
import { css } from '@/styled-system/css'

interface CreateCondoFormProps {
  /** Rota que cria: condomínio autogerido, administradora ou condomínio dentro da administradora */
  endpoint: '/api/admin/condos' | '/api/admin/organizations' | '/api/org/condos'
  /** Pede também o nome da administradora */
  withOrg?: boolean
  /** Pede os dados do administrador que nasce junto */
  withAdmin?: boolean
  submitLabel: string
  successMessage: string
}

/** Formulário de criação usado em /admin/condos (super admin) e em /condos (administradora). */
export default function CreateCondoForm({ endpoint, withOrg = false, withAdmin = false, submitLabel, successMessage }: CreateCondoFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    setError(null)
    setLoading(true)

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(formEl))),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Não foi possível criar.')
        return
      }
      toast({ variant: 'success', message: successMessage })
      formEl.reset()
      router.refresh()
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={css({ display: 'flex', flexDir: 'column', gap: '4' })}>
      {error && <Alert variant="error">{error}</Alert>}

      <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr', md: withOrg ? '1fr 1fr' : '1fr' }, gap: '4' })}>
        {withOrg && (
          <FormField label="Nome da administradora" name="orgName" required minLength={3} maxLength={120} placeholder="Administradora Exemplo" />
        )}
        <FormField
          label={withOrg ? 'Primeiro condomínio' : 'Nome do condomínio'}
          name="condoName"
          required
          minLength={3}
          maxLength={120}
          placeholder="Residencial Exemplo"
        />
      </div>

      {withAdmin && (
        <>
          <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr', md: '1fr 1fr' }, gap: '4' })}>
            <FormField label="Nome do administrador" name="adminName" required minLength={2} maxLength={120} placeholder="Nome completo" />
            <FormField label="E-mail do administrador" name="adminEmail" type="email" required placeholder="email@exemplo.com" autoComplete="off" />
          </div>
          <PasswordField
            label="Senha inicial do administrador"
            name="adminPassword"
            required
            minLength={PASSWORD_MIN}
            placeholder={PASSWORD_MIN_HINT}
            autoComplete="new-password"
          />
          <span className={css({ fontSize: 'xs', color: 'gray.500', _dark: { color: 'gray.400' } })}>
            Passe a senha ao administrador por um canal seguro. No primeiro acesso o sistema exige que ele a troque.
          </span>
        </>
      )}

      <div>
        <Button type="submit" loading={loading} leftIcon={<Building2 size={16} />}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
