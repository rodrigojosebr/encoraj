'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, FormField, Alert } from '@encoraj/ui'
import { css } from '@/styled-system/css'
import { WhatsAppField } from './WhatsAppField'

interface ResidentFormProps {
  id?: string
  defaultValues?: { name: string; apartment: string; bloco?: string; whatsapp: string }
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
    const whatsapp = form.get('whatsapp') as string

    // Valida E.164 completo: +55 + DDD (2) + número (9) = 14 chars
    if (!whatsapp || whatsapp.length < 14) {
      setError('Preencha o WhatsApp completo com DDD')
      setLoading(false)
      return
    }

    const bloco = (form.get('bloco') as string).trim() || undefined
    const body = {
      name: form.get('name') as string,
      apartment: form.get('apartment') as string,
      bloco,
      whatsapp,
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

      <FormField
        label="Nome"
        name="name"
        required
        minLength={2}
        defaultValue={defaultValues?.name}
        placeholder="Nome completo"
      />

      <div className={css({ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '3' })}>
        <FormField
          label="Bloco"
          name="bloco"
          defaultValue={defaultValues?.bloco ?? ''}
          placeholder="Ex: A, 3"
        />
        <FormField
          label="Apartamento"
          name="apartment"
          required
          defaultValue={defaultValues?.apartment}
          placeholder="Ex: 101"
        />
      </div>

      <WhatsAppField defaultValue={defaultValues?.whatsapp} />

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
