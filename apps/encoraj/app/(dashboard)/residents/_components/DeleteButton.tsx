'use client'

import { useRouter } from 'next/navigation'
import { Button, useToast } from '@encoraj/ui'

interface DeleteButtonProps {
  id: string
  name: string
}

export default function DeleteButton({ id, name }: DeleteButtonProps) {
  const router = useRouter()
  const { toast } = useToast()

  async function handleDelete() {
    if (!confirm(`Remover morador "${name}"? Esta ação pode ser revertida pelo administrador.`)) return

    const res = await fetch(`/api/residents/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ variant: 'success', message: `"${name}" removido.` })
      router.refresh()
    } else {
      const data = await res.json()
      toast({ variant: 'error', message: data.error ?? 'Erro ao remover morador' })
    }
  }

  return (
    <Button variant="ghost" intent="danger" size="sm" onClick={handleDelete}>
      Remover
    </Button>
  )
}
