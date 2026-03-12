'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, ConfirmDialog, useToast } from '@encoraj/ui'

export default function DeliverButton({ id }: { id: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)

    const res = await fetch(`/api/packages/${id}/deliver`, { method: 'POST' })

    if (res.ok) {
      toast({ variant: 'success', message: 'Retirada confirmada!' })
      router.push('/packages')
    } else {
      const data = await res.json()
      toast({ variant: 'error', message: data.error ?? 'Erro ao confirmar retirada' })
      setLoading(false)
      setOpen(false)
    }
  }

  return (
    <>
      <Button intent="primary" onClick={() => setOpen(true)}>
        Confirmar retirada
      </Button>

      <ConfirmDialog
        open={open}
        variant="warning"
        title="Confirmar retirada"
        message="O morador está retirando esta encomenda agora?"
        confirmLabel="Sim, confirmar"
        cancelLabel="Cancelar"
        loading={loading}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  )
}
