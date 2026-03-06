'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@encoraj/ui'

interface DeleteButtonProps {
  id: string
  name: string
}

export default function DeleteButton({ id, name }: DeleteButtonProps) {
  const router = useRouter()

  async function handleDelete() {
    if (!confirm(`Remover morador "${name}"? Esta ação pode ser revertida pelo administrador.`)) return

    const res = await fetch(`/api/residents/${id}`, { method: 'DELETE' })
    if (res.ok) {
      router.refresh()
    } else {
      const data = await res.json()
      alert(data.error ?? 'Erro ao remover morador')
    }
  }

  return (
    <Button variant="ghost" intent="danger" size="sm" onClick={handleDelete}>
      Remover
    </Button>
  )
}
