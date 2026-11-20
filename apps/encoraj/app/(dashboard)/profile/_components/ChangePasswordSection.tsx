'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { css } from '@/styled-system/css'
import { Button, Alert, PasswordField, useToast } from '@encoraj/ui'
import { PASSWORD_MIN, PASSWORD_MIN_HINT, PASSWORD_MIN_MESSAGE } from '@/lib/auth/password-rules'

/** "Alterar senha" do perfil: recolhível, fechado ao abrir a tela. */
export default function ChangePasswordSection() {
  const { toast } = useToast()
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }
    if (newPassword.length < PASSWORD_MIN) {
      setError(PASSWORD_MIN_MESSAGE)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/users/me/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erro ao alterar senha.')
        return
      }

      toast({ variant: 'success', message: 'Senha alterada com sucesso!' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordForm(false)
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={css({
      bg: 'white', border: '1px solid', borderColor: 'gray.200', borderRadius: 'lg',
      overflow: 'hidden',
      _dark: { bg: 'gray.900', borderColor: 'gray.700' },
    })}>
      <button
        type="button"
        onClick={() => {
          setShowPasswordForm(v => !v)
          setError(null)
        }}
        className={css({
          w: 'full', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          p: { base: '4', md: '6' }, bg: 'transparent', border: 'none', cursor: 'pointer',
          _hover: { bg: 'gray.50' },
          _dark: { _hover: { bg: 'gray.800' } },
        })}
      >
        <h2 className={css({ fontSize: 'md', fontWeight: 'semibold', color: 'gray.900', _dark: { color: 'gray.100' } })}>
          Alterar senha
        </h2>
        {showPasswordForm
          ? <ChevronUp size={18} className={css({ color: 'gray.400' })} />
          : <ChevronDown size={18} className={css({ color: 'gray.400' })} />
        }
      </button>

      {showPasswordForm && (
        <div className={css({
          px: { base: '4', md: '6' }, pb: { base: '4', md: '6' },
          borderTop: '1px solid', borderColor: 'gray.100',
          _dark: { borderColor: 'gray.800' },
        })}>
          <form onSubmit={handleSubmit} className={css({ display: 'flex', flexDir: 'column', gap: '4', pt: '4' })}>
            {error && <Alert variant="error">{error}</Alert>}

            <PasswordField
              label="Senha atual"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr', md: '1fr 1fr' }, gap: '4' })}>
              <PasswordField
                label="Nova senha"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder={PASSWORD_MIN_HINT}
              />
              <PasswordField
                label="Confirmar nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <div className={css({ display: 'flex', gap: '3' })}>
              <Button type="submit" loading={loading}>
                Salvar nova senha
              </Button>
              <Button
                type="button"
                variant="ghost"
                intent="secondary"
                onClick={() => { setShowPasswordForm(false); setError(null) }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
