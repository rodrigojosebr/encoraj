'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, useToast } from '@encoraj/ui'

export default function DeliverButton({ id }: { id: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  async function handleDeliver() {
    if (!confirm('Confirmar retirada desta encomenda?')) return
    setLoading(true)

    const res = await fetch(`/api/packages/${id}/deliver`, { method: 'POST' })

    if (res.ok) {
      toast({ variant: 'success', message: 'Retirada confirmada!' })
      router.push('/packages')
    } else {
      const data = await res.json()
      toast({ variant: 'error', message: data.error ?? 'Erro ao confirmar retirada' })
      setLoading(false)
    }
  }

  return (
    <Button intent="primary" loading={loading} onClick={handleDeliver}>
      Confirmar retirada
    </Button>
  )
}
