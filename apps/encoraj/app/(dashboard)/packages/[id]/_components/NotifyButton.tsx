'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import { css } from '@/styled-system/css'
import { Button, useToast } from '@encoraj/ui'

interface NotifyButtonProps {
  id: string
  whatsapp: string
  residentName: string
  code: string
  condoName: string
  alreadyNotified: boolean
  notifiedAt?: Date | null
}

function formatWhatsApp(raw: string): string {
  // Remove tudo que não for dígito
  const digits = raw.replace(/\D/g, '')
  // Se não começar com 55 (Brasil), adiciona
  return digits.startsWith('55') ? digits : `55${digits}`
}

export default function NotifyButton({ id, whatsapp, residentName, code, condoName, alreadyNotified, notifiedAt }: NotifyButtonProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  async function handleNotify() {
    setLoading(true)

    // Monta e abre o WhatsApp ANTES do await — mobile bloqueia window.open após async
    const publicUrl = `${window.location.origin}/p/${id}`
    const msg = [
      `📦 *Encomenda chegou!*`,
      ``,
      `Olá, ${residentName}!`,
      `Chegou uma encomenda para você em *${condoName}*.`,
      ``,
      `Código de retirada: *${code}*`,
      `Ver encomenda: ${publicUrl}`,
      ``,
      `Retire na portaria apresentando o código ou QR Code.`,
    ].join('\n')
    const waUrl = `https://wa.me/${formatWhatsApp(whatsapp)}?text=${encodeURIComponent(msg)}`
    window.open(waUrl, '_blank')

    try {
      const res = await fetch(`/api/packages/${id}/notify`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast({ variant: 'error', message: data.error ?? 'Erro ao registrar notificação' })
        setLoading(false)
        return
      }

      toast({ variant: 'success', message: 'Notificação registrada!' })
      router.refresh()
    } catch {
      toast({ variant: 'error', message: 'Erro de conexão. Tente novamente.' })
      setLoading(false)
    }
  }

  if (alreadyNotified) {
    return (
      <div className={css({ display: 'flex', alignItems: 'center', gap: '3', flexWrap: 'wrap' })}>
        <div className={css({ display: 'flex', alignItems: 'center', gap: '1.5', color: 'green.600', _dark: { color: 'green.400' } })}>
          <MessageCircle size={15} />
          <span className={css({ fontSize: 'sm', fontWeight: 'medium' })}>
            Notificado{notifiedAt ? ` em ${new Date(notifiedAt).toLocaleString('pt-BR')}` : ''}
          </span>
        </div>
        <Button variant="ghost" intent="secondary" size="sm" loading={loading} onClick={handleNotify}>
          Reenviar
        </Button>
      </div>
    )
  }

  return (
    <Button intent="secondary" loading={loading} onClick={handleNotify}>
      <MessageCircle size={16} />
      Notificar via WhatsApp
    </Button>
  )
}
