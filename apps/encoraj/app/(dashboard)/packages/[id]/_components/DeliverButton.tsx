'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound } from 'lucide-react'
import { css } from '@/styled-system/css'
import { Button, useToast } from '@encoraj/ui'

export default function DeliverButton({ id, hasPin }: { id: string; hasPin: boolean }) {
  const router = useRouter()
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)

  const [open, setOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function openDialog() {
    setPin('')
    setError('')
    setOpen(true)
    // Foca o input após render
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function closeDialog() {
    setOpen(false)
    setPin('')
    setError('')
    setLoading(false)
  }

  async function handleConfirm() {
    if (hasPin && !pin.trim()) {
      setError('Digite o código de retirada.')
      inputRef.current?.focus()
      return
    }

    setError('')
    setLoading(true)

    const res = await fetch(`/api/packages/${id}/deliver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hasPin ? { pin: pin.trim() } : {}),
    })

    if (res.ok) {
      toast({ variant: 'success', message: 'Retirada confirmada!' })
      router.push('/packages')
    } else {
      const data = await res.json()
      setError(data.error ?? 'Erro ao confirmar retirada.')
      setLoading(false)
      if (hasPin) inputRef.current?.focus()
    }
  }

  return (
    <>
      <Button intent="primary" onClick={openDialog}>
        Confirmar retirada
      </Button>

      {open && (
        <div
          className={css({
            position: 'fixed',
            inset: '0',
            zIndex: '50',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: '4',
          })}
        >
          {/* Overlay */}
          <div
            className={css({ position: 'absolute', inset: '0', bg: 'blackAlpha.600' })}
            onClick={closeDialog}
          />

          {/* Dialog */}
          <div
            className={css({
              position: 'relative',
              bg: 'white',
              borderRadius: 'xl',
              p: '6',
              w: 'full',
              maxW: '400px',
              display: 'flex',
              flexDir: 'column',
              gap: '5',
              boxShadow: 'xl',
              _dark: { bg: 'gray.900', borderColor: 'gray.700' },
            })}
          >
            {/* Ícone + Título */}
            <div className={css({ display: 'flex', flexDir: 'column', gap: '1' })}>
              <div className={css({ display: 'flex', alignItems: 'center', gap: '2' })}>
                <KeyRound size={20} className={css({ color: 'blue.600', _dark: { color: 'blue.400' } })} />
                <h2 className={css({ fontSize: 'lg', fontWeight: 'bold', color: 'gray.900', _dark: { color: 'gray.50' } })}>
                  Confirmar retirada
                </h2>
              </div>
              <p className={css({ fontSize: 'sm', color: 'gray.500', _dark: { color: 'gray.400' } })}>
                {hasPin
                  ? 'Solicite ao morador o código de retirada recebido via WhatsApp.'
                  : 'O morador está retirando esta encomenda agora?'}
              </p>
            </div>

            {/* Input PIN */}
            {hasPin && (
              <div className={css({ display: 'flex', flexDir: 'column', gap: '1.5' })}>
                <label className={css({ fontSize: 'sm', fontWeight: 'medium', color: 'gray.700', _dark: { color: 'gray.300' } })}>
                  Código de retirada
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={pin}
                  onChange={(e) => {
                    setError('')
                    setPin(e.target.value.replace(/\D/g, ''))
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm() }}
                  className={css({
                    w: 'full',
                    px: '4',
                    py: '3',
                    border: '2px solid',
                    borderColor: error ? 'red.400' : 'gray.300',
                    borderRadius: 'lg',
                    fontSize: '2xl',
                    fontFamily: 'mono',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    letterSpacing: 'widest',
                    outline: 'none',
                    _focus: { borderColor: error ? 'red.400' : 'blue.500' },
                    _dark: { bg: 'gray.800', borderColor: error ? 'red.500' : 'gray.600', color: 'gray.50' },
                  })}
                />
                {error && (
                  <p className={css({ fontSize: 'sm', color: 'red.600', _dark: { color: 'red.400' } })}>
                    {error}
                  </p>
                )}
              </div>
            )}

            {/* Botões */}
            <div className={css({ display: 'flex', gap: '3', justifyContent: 'flex-end' })}>
              <Button variant="ghost" intent="secondary" onClick={closeDialog} disabled={loading}>
                Cancelar
              </Button>
              <Button intent="primary" loading={loading} onClick={handleConfirm}>
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
