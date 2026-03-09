'use client'

import { useRouter } from 'next/navigation'
import { Button, useToast } from '@encoraj/ui'

interface RestoreButtonProps {
  id: string
  name: string
}

export default function RestoreButton({ id, name }: RestoreButtonProps) {
  const router = useRouter()
  const { toast } = useToast()

  async function handleRestore() {
    if (!confirm(`Restaurar morador "${name}"?`)) return

    const res = await fetch(`/api/residents/${id}`, { method: 'PATCH' })
    if (res.ok) {
      toast({ variant: 'success', message: `"${name}" restaurado.` })
      router.refresh()
    } else {
      const data = await res.json()
      toast({ variant: 'error', message: data.error ?? 'Erro ao restaurar morador' })
    }
  }

  return (
    <Button variant="ghost" intent="primary" size="sm" onClick={handleRestore}>
      Restaurar
    </Button>
  )
}
