'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw } from 'lucide-react'
import { ConfirmDialog, useToast } from '@encoraj/ui'
import { css } from '@/styled-system/css'

interface RestoreButtonProps {
  id: string
  name: string
}

export default function RestoreButton({ id, name }: RestoreButtonProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    const res = await fetch(`/api/residents/${id}`, { method: 'PATCH' })
    if (res.ok) {
      toast({ variant: 'success', message: `"${name}" restaurado.` })
      router.refresh()
    } else {
      const data = await res.json()
      toast({ variant: 'error', message: data.error ?? 'Erro ao restaurar morador' })
      setLoading(false)
      setOpen(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Restaurar morador"
        className={css({
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          w: '8', h: '8', borderRadius: 'md', border: 'none', bg: 'transparent',
          color: 'gray.400', cursor: 'pointer', transition: 'all 0.15s',
          _hover: { color: 'blue.600', bg: 'blue.50' },
          _dark: { color: 'gray.500', _hover: { color: 'blue.400', bg: 'blue.950' } },
        })}
      >
        <RotateCcw size={16} />
      </button>

      <ConfirmDialog
        open={open}
        variant="warning"
        title="Restaurar morador"
        message={`Restaurar "${name}" e reativar o cadastro?`}
        confirmLabel="Sim, restaurar"
        cancelLabel="Cancelar"
        loading={loading}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  )
}
