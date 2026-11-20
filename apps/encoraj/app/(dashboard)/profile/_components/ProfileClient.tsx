'use client'

import { useState } from 'react'
import { Camera, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { css } from '@/styled-system/css'
import { Button, Alert, PasswordField, useToast } from '@encoraj/ui'
import { PASSWORD_MIN, PASSWORD_MIN_HINT, PASSWORD_MIN_MESSAGE } from '@/lib/auth/password-rules'
import Avatar from '@/app/(dashboard)/_components/Avatar'
import { PHOTO_ACCEPT, usePhotoUpload } from '../../_lib/use-photo-upload'
import { labelCss, valueCss } from '@/app/(dashboard)/_lib/styles'

interface ProfileClientProps {
  name: string
  email: string
  roleLabel: string
  condoName: string
  isAdmin: boolean
  userId: string
  photoUrl: string | null
}

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
  // Desestruturado de propósito: com `photo.inputRef` a regra react-hooks/refs trata o objeto todo como ref e barra o render
  const {
    photoUrl,
    uploading: uploadingPhoto,
    inputRef: photoInputRef,
    openPicker: openPhotoPicker,
    onFileChange: handlePhotoChange,
    remove: removePhoto,
  } = usePhotoUpload('/api/users/me/photo', 'user-photo-updated', initialPhotoUrl)
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
    <div className={css({ display: 'flex', flexDir: 'column', gap: '6', maxW: '680px' })}>
      <h1 className={css({ fontSize: '2xl', fontWeight: 'bold', color: 'gray.900', _dark: { color: 'gray.50' } })}>
        Meu perfil
      </h1>

      {/* Dados do usuário */}
      <div className={css({
        bg: 'white', border: '1px solid', borderColor: 'gray.200', borderRadius: 'lg',
        p: { base: '4', md: '6' },
        _dark: { bg: 'gray.900', borderColor: 'gray.700' },
      })}>
        {/* Layout: avatar à esquerda em desktop, topo em mobile */}
        <div className={css({
          display: 'flex',
          flexDir: { base: 'column', md: 'row' },
          gap: { base: '4', md: '6' },
        })}>
          {/* Avatar column */}
          <div className={css({
            display: 'flex',
            flexDir: { base: 'row', md: 'column' },
            alignItems: { base: 'center', md: 'center' },
            gap: '3',
            flexShrink: 0,
            md: { w: '140px' },
          })}>
            <button
              type="button"
              onClick={openPhotoPicker}
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
            <div className={css({ display: 'flex', flexDir: 'column', gap: '1', alignItems: { md: 'center' } })}>
              <p className={css({ fontSize: 'xs', color: 'gray.500', textAlign: { md: 'center' }, _dark: { color: 'gray.400' } })}>
                {uploadingPhoto ? 'Enviando…' : 'Clique para trocar'}
              </p>
              <p className={css({ fontSize: '10px', color: 'gray.400', textAlign: { md: 'center' } })}>JPEG, PNG ou WebP</p>
              {photoUrl && !uploadingPhoto && (
                <button
                  type="button"
                  onClick={removePhoto}
                  className={css({
                    display: 'inline-flex', alignItems: 'center', gap: '1',
                    fontSize: 'xs', color: 'red.500', bg: 'none', border: 'none',
                    cursor: 'pointer', p: '0', w: 'fit-content',
                    _hover: { color: 'red.700' },
                  })}
                >
                  <Trash2 size={12} /> Remover
                </button>
              )}
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept={PHOTO_ACCEPT}
              className={css({ display: 'none' })}
              onChange={handlePhotoChange}
            />
          </div>

          {/* Data column */}
          <div className={css({ flex: '1', display: 'flex', flexDir: 'column', gap: '4' })}>
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

            <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4' })}>
              <div className={css({ display: 'flex', flexDir: 'column', gap: '0.5' })}>
                <span className={labelCss}>Nome</span>
                <span className={valueCss}>{name}</span>
              </div>
              <div className={css({ display: 'flex', flexDir: 'column', gap: '0.5' })}>
                <span className={labelCss}>Função</span>
                <span className={valueCss}>{roleLabel}</span>
              </div>
              <div className={css({ display: 'flex', flexDir: 'column', gap: '0.5', gridColumn: '1 / -1' })}>
                <span className={labelCss}>Email</span>
                <span className={valueCss}>{email}</span>
              </div>
              <div className={css({ display: 'flex', flexDir: 'column', gap: '0.5', gridColumn: '1 / -1' })}>
                <span className={labelCss}>Condomínio</span>
                <span className={valueCss}>{condoName}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alterar senha — recolhível */}
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
    </div>
  )
}
