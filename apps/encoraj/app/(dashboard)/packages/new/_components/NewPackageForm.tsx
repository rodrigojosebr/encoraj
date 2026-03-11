'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Upload, X } from 'lucide-react'
import { css } from '@/styled-system/css'
import { Button, FormField } from '@encoraj/ui'
import { useToast } from '@encoraj/ui'

interface ResidentOption {
  value: string
  label: string
}

export default function NewPackageForm({ residents }: { residents: ResidentOption[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [residentId, setResidentId] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleFile(file: File | null) {
    if (!file) return
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
    setError('')
  }

  function clearPhoto() {
    setPhoto(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!photo) { setError('Adicione uma foto da etiqueta.'); return }
    if (!residentId) { setError('Selecione o morador destinatário.'); return }

    setLoading(true)
    try {
      // 1. Upload foto
      const fd = new FormData()
      fd.append('file', photo)
      const upRes = await fetch('/api/upload', { method: 'POST', body: fd })
      const upData = await upRes.json()
      if (!upRes.ok) { setError(upData.error ?? 'Erro ao enviar foto.'); setLoading(false); return }

      // 2. Criar encomenda
      const pkgRes = await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resident_id: residentId, photo_url: upData.url, notes: notes.trim() || undefined }),
      })
      const pkgData = await pkgRes.json()
      if (!pkgRes.ok) { setError(pkgData.error ?? 'Erro ao registrar encomenda.'); setLoading(false); return }

      toast({ variant: 'success', message: `Encomenda ${pkgData.code} registrada com sucesso!` })
      router.push(`/packages/${pkgData._id}`)
    } catch {
      setError('Erro de conexão. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={css({ display: 'flex', flexDir: 'column', gap: '6' })}>

      {/* Foto */}
      <div className={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
        <span className={css({ fontSize: 'sm', fontWeight: 'medium', color: 'gray.700', _dark: { color: 'gray.300' } })}>
          Foto da etiqueta <span className={css({ color: 'red.500' })}>*</span>
        </span>

        {!preview ? (
          <div className={css({
            border: '2px dashed',
            borderColor: 'gray.300',
            borderRadius: 'xl',
            p: '8',
            display: 'flex',
            flexDir: 'column',
            alignItems: 'center',
            gap: '4',
            _dark: { borderColor: 'gray.600' },
          })}>
            <div className={css({ display: 'flex', gap: '3', flexWrap: 'wrap', justifyContent: 'center' })}>
              <Button
                type="button"
                variant="outline"
                intent="secondary"
                size="sm"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera size={16} />
                Fotografar
              </Button>
              <Button
                type="button"
                variant="outline"
                intent="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={16} />
                Carregar arquivo
              </Button>
            </div>
            <p className={css({ fontSize: 'xs', color: 'gray.400', textAlign: 'center' })}>
              JPEG, PNG ou WebP · máx. 10 MB
            </p>
          </div>
        ) : (
          <div className={css({ position: 'relative', borderRadius: 'xl', overflow: 'hidden', maxH: '320px' })}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Preview" className={css({ w: 'full', h: 'full', objectFit: 'cover' })} />
            <button
              type="button"
              onClick={clearPhoto}
              className={css({
                position: 'absolute',
                top: '2',
                right: '2',
                bg: 'blackAlpha.700',
                color: 'white',
                borderRadius: 'full',
                p: '1',
                cursor: 'pointer',
                _hover: { bg: 'blackAlpha.800' },
              })}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* inputs ocultos */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className={css({ display: 'none' })}
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className={css({ display: 'none' })}
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {/* Morador */}
      <div className={css({ display: 'flex', flexDir: 'column', gap: '1' })}>
        <label className={css({ fontSize: 'sm', fontWeight: 'medium', color: 'gray.700', _dark: { color: 'gray.300' } })}>
          Morador destinatário <span className={css({ color: 'red.500' })}>*</span>
        </label>
        <select
          value={residentId}
          onChange={(e) => setResidentId(e.target.value)}
          className={css({
            w: 'full',
            px: '3',
            py: '2',
            border: '1px solid',
            borderColor: 'gray.300',
            borderRadius: 'md',
            fontSize: 'sm',
            bg: 'white',
            outline: 'none',
            _focus: { borderColor: 'blue.500', ring: '1px', ringColor: 'blue.500' },
            _dark: { bg: 'gray.900', borderColor: 'gray.700', color: 'gray.100' },
          })}
        >
          <option value="">Selecione o morador…</option>
          {residents.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {/* Observações */}
      <FormField
        label="Observações"
        hint="Opcional — frágil, volumoso, etc."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Ex: Frágil, caixa grande…"
      />

      {error && (
        <p className={css({ fontSize: 'sm', color: 'red.600', _dark: { color: 'red.400' } })}>
          {error}
        </p>
      )}

      <div className={css({ display: 'flex', gap: '3', justifyContent: 'flex-end' })}>
        <Button type="button" variant="ghost" intent="secondary" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Registrando…' : 'Registrar chegada'}
        </Button>
      </div>
    </form>
  )
}
