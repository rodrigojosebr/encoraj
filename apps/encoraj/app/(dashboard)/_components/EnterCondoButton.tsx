'use client'

import { useState } from 'react'
import { LogIn } from 'lucide-react'
import { Button, useToast } from '@encoraj/ui'

/** Troca a sessão (super admin ou admin da administradora) para este condomínio e recarrega o app já dentro dele. */
export default function EnterCondoButton({ id }: { id: string }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  async function enter() {
    setLoading(true)
    try {
      const res = await fetch(`/api/condos/${id}/enter`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast({ variant: 'error', message: data.error ?? 'Não foi possível entrar no condomínio.' })
        setLoading(false)
        return
      }
      // Recarga completa, não router.push: a sessão agora aponta para outro condomínio e o
      // layout do dashboard (menu, nome e foto do condomínio) precisa ser renderizado de novo
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- troca de sessão (ver CLAUDE.md)
      window.location.href = '/'
    } catch {
      toast({ variant: 'error', message: 'Erro de conexão. Tente novamente.' })
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" intent="secondary" size="sm" loading={loading} leftIcon={<LogIn size={14} />} onClick={enter}>
      Entrar
    </Button>
  )
}
