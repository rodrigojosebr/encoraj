'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Camera } from 'lucide-react'
import { css } from '@/styled-system/css'
import { Button, FormField, Alert, useToast } from '@encoraj/ui'

export default function SettingsPage() {
  const { toast } = useToast()
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/condo')
      .then((r) => r.json())
      .then((data) => { setName(data.name ?? ''); setPhotoUrl(data.photo_url ?? null); setLoading(false) })
      .catch(() => { setError('Erro ao carregar dados do condomínio'); setLoading(false) })
  }, [])

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/condo/photo', { method: 'POST', body: fd })
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
    setSaving(true)
    setError(null)

    const res = await fetch('/api/condo', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })

    setSaving(false)
    if (res.ok) {
      toast({ variant: 'success', message: 'Nome atualizado! Recarregando…' })
      // Reload para o layout pegar o novo JWT com condo_name atualizado
      setTimeout(() => window.location.reload(), 1200)
    } else {
      const data = await res.json()
      setError(data.error ?? 'Erro ao salvar')
    }
  }

  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '6' })}>
      <h1 className={css({ fontSize: '2xl', fontWeight: 'bold', color: 'gray.900', _dark: { color: 'gray.50' } })}>
        Configurações
      </h1>

      {/* Dados do condomínio */}
      <section className={css({ display: 'flex', flexDir: 'column', gap: '4' })}>
        <h2 className={css({ fontSize: 'sm', fontWeight: 'semibold', color: 'gray.500', textTransform: 'uppercase', letterSpacing: 'wide', _dark: { color: 'gray.400' } })}>
          Condomínio
        </h2>

        <div className={css({ bg: 'white', border: '1px solid', borderColor: 'gray.200', borderRadius: 'lg', p: { base: '4', md: '6' }, display: 'flex', flexDir: 'column', gap: '5', _dark: { bg: 'gray.900', borderColor: 'gray.700' } })}>

          {/* Foto do condomínio */}
          <div className={css({ display: 'flex', alignItems: 'center', gap: '4' })}>
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
              title="Trocar foto do condomínio"
              className={css({ position: 'relative', cursor: 'pointer', border: 'none', p: '0', bg: 'transparent', flexShrink: 0 })}
            >
              <div className={css({
                w: '20', h: '20', borderRadius: 'xl', overflow: 'hidden',
                border: '2px solid', borderColor: 'gray.200',
                bg: 'gray.100', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                _dark: { borderColor: 'gray.600', bg: 'gray.800' },
              })}>
                {photoUrl ? (
                  <Image src={photoUrl} alt="Foto do condomínio" width={80} height={80} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                ) : (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#9ca3af' }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                )}
              </div>
              <span className={css({
                position: 'absolute', inset: '0', borderRadius: 'xl',
                bg: 'blackAlpha.500', display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: uploadingPhoto ? '1' : '0', transition: 'opacity 0.2s',
                _hover: { opacity: '1' },
              })}>
                <Camera size={20} color="white" />
              </span>
            </button>
            <div>
              <p className={css({ fontSize: 'sm', fontWeight: 'medium', color: 'gray.700', _dark: { color: 'gray.300' } })}>
                {uploadingPhoto ? 'Enviando…' : 'Foto do condomínio'}
              </p>
              <p className={css({ fontSize: 'xs', color: 'gray.400', mt: '0.5' })}>
                Clique para trocar · JPEG, PNG ou WebP
              </p>
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className={css({ display: 'none' })}
              onChange={handlePhotoChange}
            />
          </div>

          {/* Nome */}
          <form onSubmit={handleSubmit} className={css({ display: 'flex', flexDir: 'column', gap: '4', maxW: '480px' })}>
            {error && <Alert variant="error">{error}</Alert>}

            <FormField
              label="Nome do condomínio"
              name="name"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Residencial das Flores"
              disabled={loading}
            />

            <div>
              <Button type="submit" disabled={saving || loading}>
                {saving ? 'Salvando…' : 'Salvar alterações'}
              </Button>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}
