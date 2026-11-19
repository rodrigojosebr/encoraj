'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, RotateCcw } from 'lucide-react'
import { Button, useToast } from '@encoraj/ui'

export default function ResolveButton({ id, resolved }: { id: string; resolved: boolean }) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/errors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: !resolved }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast({ variant: 'error', message: data.error ?? 'Não foi possível atualizar.' })
        return
      }
      toast({ variant: 'success', message: resolved ? 'Erro reaberto.' : 'Marcado como resolvido.' })
      router.refresh()
    } catch {
      toast({ variant: 'error', message: 'Erro de conexão. Tente novamente.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      intent="secondary"
      size="sm"
      loading={loading}
      leftIcon={resolved ? <RotateCcw size={14} /> : <Check size={14} />}
      onClick={toggle}
    >
      {resolved ? 'Reabrir' : 'Resolver'}
    </Button>
  )
}
