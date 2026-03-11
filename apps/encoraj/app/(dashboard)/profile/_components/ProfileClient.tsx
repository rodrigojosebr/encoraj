'use client'

import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { css } from '@/styled-system/css'
import { Button, Alert, useToast } from '@encoraj/ui'
import Avatar from '@/app/(dashboard)/_components/Avatar'

const eyeOpen = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)
const eyeOff = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  placeholder = '••••••••',
}: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  autoComplete?: string
  placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '1.5' })}>
      <label className={css({ fontSize: 'sm', fontWeight: 'medium', color: 'gray.700', _dark: { color: 'gray.300' } })}>
        {label}
      </label>
      <div className={css({ position: 'relative' })}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required
          autoComplete={autoComplete}
          className={css({
            w: 'full', px: '3', py: '2', pr: '10', fontSize: 'sm',
            borderRadius: 'md', border: '1px solid', borderColor: 'gray.300',
            bg: 'white', color: 'gray.900', outline: 'none',
            _focus: { borderColor: 'blue.500', ring: '2px', ringColor: 'blue.200' },
            _dark: { bg: 'gray.800', borderColor: 'gray.600', color: 'gray.100', _focus: { borderColor: 'blue.400', ringColor: 'blue.800' } },
          })}
        />
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
          className={css({
            position: 'absolute', right: '3', top: '50%', transform: 'translateY(-50%)',
            color: 'gray.400', bg: 'none', border: 'none', p: '0', cursor: 'pointer', lineHeight: '1',
            _hover: { color: 'gray.600' },
          })}
        >
          {show ? eyeOff : eyeOpen}
        </button>
      </div>
    </div>
  )
}

interface ProfileClientProps {
  name: string
  email: string
  roleLabel: string
  condoName: string
  isAdmin: boolean
  userId: string
  photoUrl: string | null
}

const rowCss = css({ display: 'flex', flexDir: 'column', gap: '0.5' })
const labelCss = css({ fontSize: 'xs', fontWeight: 'semibold', color: 'gray.500', textTransform: 'uppercase', letterSpacing: 'wide', _dark: { color: 'gray.400' } })
const valueCss = css({ fontSize: 'sm', color: 'gray.900', _dark: { color: 'gray.100' } })

export default function ProfileClient({
  name,
  email,
  roleLabel,
  condoName,
  isAdmin,
  userId,
  photoUrl: initialPhotoUrl,
}: ProfileClientProps) {
  const { toast } = useToast()
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/users/me/photo', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { toast({ variant: 'error', message: data.error ?? 'Erro ao enviar foto.' }); return }
      setPhotoUrl(data.photo_url)
      toast({ variant: 'success', message: 'Foto atualizada!' })
    } catch {
      toast({ variant: 'error', message: 'Erro de conexão. Tente novamente.' })
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }
    if (newPassword.length < 8) {
      setError('A nova senha deve ter pelo menos 8 caracteres.')
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
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '6', maxW: '480px' })}>
      <h1 className={css({ fontSize: '2xl', fontWeight: 'bold', color: 'gray.900', _dark: { color: 'gray.50' } })}>
        Meu perfil
      </h1>

      {/* Dados do usuário */}
      <div className={css({
        bg: 'white', border: '1px solid', borderColor: 'gray.200', borderRadius: 'lg',
        p: { base: '4', md: '6' }, display: 'flex', flexDir: 'column', gap: '4',
        _dark: { bg: 'gray.900', borderColor: 'gray.700' },
      })}>

        {/* Avatar clicável */}
        <div className={css({ display: 'flex', alignItems: 'center', gap: '4' })}>
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            disabled={uploadingPhoto}
            title="Trocar foto"
            className={css({ position: 'relative', borderRadius: 'full', cursor: 'pointer', border: 'none', p: '0', bg: 'transparent', flexShrink: 0 })}
          >
            <Avatar name={name} photoUrl={photoUrl} size="xl" />
            <span className={css({
              position: 'absolute', inset: '0', borderRadius: 'full',
              bg: 'blackAlpha.500', display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: uploadingPhoto ? '1' : '0', transition: 'opacity 0.2s',
              _hover: { opacity: '1' },
            })}>
              <Camera size={20} color="white" />
            </span>
          </button>
          <div>
            <p className={css({ fontSize: 'sm', fontWeight: 'medium', color: 'gray.700', _dark: { color: 'gray.300' } })}>
              {uploadingPhoto ? 'Enviando…' : 'Clique na foto para trocar'}
            </p>
            <p className={css({ fontSize: 'xs', color: 'gray.400', mt: '0.5' })}>JPEG, PNG ou WebP</p>
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className={css({ display: 'none' })}
            onChange={handlePhotoChange}
          />
        </div>

        <div className={css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' })}>
          <h2 className={css({ fontSize: 'md', fontWeight: 'semibold', color: 'gray.900', _dark: { color: 'gray.100' } })}>
            Dados da conta
          </h2>
          {isAdmin ? (
            <a
              href={`/users/${userId}/edit`}
              className={css({ fontSize: 'sm', color: 'blue.600', textDecoration: 'none', fontWeight: 'medium', _hover: { textDecoration: 'underline' }, _dark: { color: 'blue.400' } })}
            >
              Editar
            </a>
          ) : (
            <button
              type="button"
              onClick={() => toast({ variant: 'info', message: 'Para alterar seus dados, solicite ao administrador do condomínio.' })}
              className={css({ fontSize: 'sm', color: 'blue.600', fontWeight: 'medium', bg: 'none', border: 'none', cursor: 'pointer', p: '0', _hover: { textDecoration: 'underline' }, _dark: { color: 'blue.400' } })}
            >
              Editar
            </button>
          )}
        </div>

        <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr', md: '1fr 1fr' }, gap: '4' })}>
          <div className={rowCss}>
            <span className={labelCss}>Nome</span>
            <span className={valueCss}>{name}</span>
          </div>
          <div className={rowCss}>
            <span className={labelCss}>Email</span>
            <span className={valueCss}>{email}</span>
          </div>
          <div className={rowCss}>
            <span className={labelCss}>Função</span>
            <span className={valueCss}>{roleLabel}</span>
          </div>
          <div className={rowCss}>
            <span className={labelCss}>Condomínio</span>
            <span className={valueCss}>{condoName}</span>
          </div>
        </div>

      </div>

      {/* Alterar senha */}
      <div className={css({
        bg: 'white', border: '1px solid', borderColor: 'gray.200', borderRadius: 'lg',
        p: { base: '4', md: '6' },
        _dark: { bg: 'gray.900', borderColor: 'gray.700' },
      })}>
        <h2 className={css({ fontSize: 'md', fontWeight: 'semibold', color: 'gray.900', mb: '4', _dark: { color: 'gray.100' } })}>
          Alterar senha
        </h2>

        <form onSubmit={handleSubmit} className={css({ display: 'flex', flexDir: 'column', gap: '4' })}>
          {error && <Alert variant="error">{error}</Alert>}

          <PasswordField
            label="Senha atual"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
          <PasswordField
            label="Nova senha"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
          />
          <PasswordField
            label="Confirmar nova senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />

          <Button type="submit" loading={loading}>
            Salvar nova senha
          </Button>
        </form>
      </div>
    </div>
  )
}
