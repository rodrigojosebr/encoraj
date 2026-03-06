'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@encoraj/ui'

interface DeleteUserButtonProps {
  id: string
  name: string
}

export default function DeleteUserButton({ id, name }: DeleteUserButtonProps) {
  const router = useRouter()

  async function handleDelete() {
    if (!confirm(`Desativar usuário "${name}"? O acesso será bloqueado imediatamente.`)) return

    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
    if (res.ok) {
      router.refresh()
    } else {
      const data = await res.json()
      alert(data.error ?? 'Erro ao desativar usuário')
    }
  }

  return (
    <Button variant="ghost" intent="danger" size="sm" onClick={handleDelete}>
      Desativar
    </Button>
  )
}
