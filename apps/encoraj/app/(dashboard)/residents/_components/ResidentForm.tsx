'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, FormField, Input, Alert } from '@encoraj/ui'
import { css } from '@/styled-system/css'

interface ResidentFormProps {
  id?: string
  defaultValues?: { name: string; apartment: string; whatsapp: string }
}

export default function ResidentForm({ id, defaultValues }: ResidentFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const body = {
      name: form.get('name') as string,
      apartment: form.get('apartment') as string,
      whatsapp: form.get('whatsapp') as string,
    }

    try {
      const res = await fetch(id ? `/api/residents/${id}` : '/api/residents', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        window.location.href = '/residents'
      } else {
        const data = await res.json()
        setError(data.error ?? 'Erro ao salvar morador')
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

      <FormField label="Nome" htmlFor="name">
        <Input
          id="name"
          name="name"
          required
          minLength={2}
          defaultValue={defaultValues?.name}
          placeholder="Nome completo"
        />
      </FormField>

      <FormField label="Apartamento" htmlFor="apartment">
        <Input
          id="apartment"
          name="apartment"
          required
          defaultValue={defaultValues?.apartment}
          placeholder="Ex: 101, Bloco A"
        />
      </FormField>

      <FormField label="WhatsApp" htmlFor="whatsapp">
        <Input
          id="whatsapp"
          name="whatsapp"
          required
          defaultValue={defaultValues?.whatsapp}
          placeholder="+55 11 99999-9999"
        />
      </FormField>

      <div className={css({ display: 'flex', gap: '3', pt: '2' })}>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando…' : id ? 'Salvar alterações' : 'Cadastrar morador'}
        </Button>
        <Button type="button" variant="ghost" intent="secondary" onClick={() => router.push('/residents')}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
