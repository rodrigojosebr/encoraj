'use client'

import { useRouter } from 'next/navigation'
import { Button, useToast } from '@encoraj/ui'

interface DeleteUserButtonProps {
  id: string
  name: string
}

export default function DeleteUserButton({ id, name }: DeleteUserButtonProps) {
  const router = useRouter()
  const { toast } = useToast()

  async function handleDelete() {
    if (!confirm(`Desativar usuário "${name}"? O acesso será bloqueado imediatamente.`)) return

    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ variant: 'success', message: `"${name}" desativado.` })
      router.refresh()
    } else {
      const data = await res.json()
      toast({ variant: 'error', message: data.error ?? 'Erro ao desativar usuário' })
    }
  }

  return (
    <Button variant="ghost" intent="danger" size="sm" onClick={handleDelete}>
      Desativar
    </Button>
  )
}
