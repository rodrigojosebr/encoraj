'use client'

import { useState } from 'react'
import { Button, Alert } from '@encoraj/ui'

export default function DeliverButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDeliver() {
    if (!confirm('Confirmar retirada desta encomenda?')) return
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/packages/${id}/deliver`, { method: 'POST' })

    if (res.ok) {
      window.location.href = '/packages'
    } else {
      const data = await res.json()
      setError(data.error ?? 'Erro ao confirmar entrega')
      setLoading(false)
    }
  }

  return (
    <div>
      {error && <Alert variant="error" className="mb-3">{error}</Alert>}
      <Button intent="primary" loading={loading} onClick={handleDeliver}>
        Confirmar retirada
      </Button>
    </div>
  )
}
