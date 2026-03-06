'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@encoraj/ui'

interface RestoreButtonProps {
  id: string
  name: string
}

export default function RestoreButton({ id, name }: RestoreButtonProps) {
  const router = useRouter()

  async function handleRestore() {
    if (!confirm(`Restaurar morador "${name}"?`)) return

    const res = await fetch(`/api/residents/${id}`, { method: 'PATCH' })
    if (res.ok) {
      router.refresh()
    } else {
      const data = await res.json()
      alert(data.error ?? 'Erro ao restaurar morador')
    }
  }

  return (
    <Button variant="ghost" intent="primary" size="sm" onClick={handleRestore}>
      Restaurar
    </Button>
  )
}
