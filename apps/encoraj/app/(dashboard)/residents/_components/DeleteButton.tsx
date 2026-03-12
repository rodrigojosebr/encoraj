'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { ConfirmDialog, useToast } from '@encoraj/ui'
import { css } from '@/styled-system/css'

interface DeleteButtonProps {
  id: string
  name: string
}

export default function DeleteButton({ id, name }: DeleteButtonProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    const res = await fetch(`/api/residents/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ variant: 'success', message: `"${name}" removido.` })
      router.refresh()
    } else {
      const data = await res.json()
      toast({ variant: 'error', message: data.error ?? 'Erro ao remover morador' })
      setLoading(false)
      setOpen(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Remover morador"
        className={css({
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          w: '8', h: '8', borderRadius: 'md', border: 'none', bg: 'transparent',
          color: 'gray.400', cursor: 'pointer', transition: 'all 0.15s',
          _hover: { color: 'red.600', bg: 'red.50' },
          _dark: { color: 'gray.500', _hover: { color: 'red.400', bg: 'red.950' } },
        })}
      >
        <Trash2 size={16} />
      </button>

      <ConfirmDialog
        open={open}
        variant="danger"
        title="Remover morador"
        message={`Remover "${name}"? A ação pode ser revertida pelo administrador.`}
        confirmLabel="Sim, remover"
        cancelLabel="Cancelar"
        loading={loading}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  )
}
