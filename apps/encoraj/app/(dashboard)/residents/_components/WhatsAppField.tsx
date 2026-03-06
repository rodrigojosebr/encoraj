'use client'

import { useId, useState } from 'react'
import { input } from '@/styled-system/recipes'

// Mantém apenas dígitos, remove prefixo 55 se o usuário digitou
function extractDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  return digits.startsWith('55') ? digits.slice(2) : digits
}

// Formata como +55 (XX) XXXXX-XXXX
function applyMask(raw: string): string {
  const d = extractDigits(raw).slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `+55 (${d}`
  if (d.length <= 7) return `+55 (${d.slice(0, 2)}) ${d.slice(2)}`
  return `+55 (${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

// Converte para E.164 (+5511999999999)
function toE164(masked: string): string {
  const digits = masked.replace(/\D/g, '')
  if (!digits) return ''
  return digits.startsWith('55') ? `+${digits}` : `+55${digits}`
}

// Número completo = DDD (2) + celular (9) = 11 dígitos locais
function isComplete(masked: string): boolean {
  return extractDigits(masked).length === 11
}

interface WhatsAppFieldProps {
  defaultValue?: string
}

export function WhatsAppField({ defaultValue }: WhatsAppFieldProps) {
  const id = useId()
  const [masked, setMasked] = useState(() => applyMask(defaultValue ?? ''))
  const [touched, setTouched] = useState(false)

  const showError = touched && masked.length > 0 && !isComplete(masked)
  const classes = input({ error: showError })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setMasked(applyMask(e.target.value))
  }

  return (
    <div className={classes.wrapper}>
      <label htmlFor={id} className={classes.label}>
        WhatsApp
      </label>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        value={masked}
        onChange={handleChange}
        onBlur={() => setTouched(true)}
        placeholder="+55 (11) 99999-9999"
        className={classes.input}
        autoComplete="tel"
      />
      {/* Input oculto entrega o valor E.164 ao FormData */}
      <input type="hidden" name="whatsapp" value={toE164(masked)} />
      {showError && (
        <span className={classes.errorMessage} role="alert">
          Número incompleto — preencha DDD + 9 dígitos
        </span>
      )}
    </div>
  )
}
