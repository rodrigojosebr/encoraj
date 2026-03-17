'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Upload, X, CheckCircle2, AlertCircle, Loader2, UserCheck, Trash2 } from 'lucide-react'
import { css } from '@/styled-system/css'
import { Button, FormField } from '@encoraj/ui'
import { useToast } from '@encoraj/ui'

interface ResidentOption {
  value: string
  label: string
}

type OcrStatus = 'idle' | 'loading' | 'matched' | 'confirmed' | 'rejected' | 'not_found' | 'error'

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

  // OCR state
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>('idle')
  const [ocrMatch, setOcrMatch] = useState<ResidentOption | null>(null)
  const [ocrExtractedText, setOcrExtractedText] = useState('')

  function resetOcr() {
    setOcrStatus('idle')
    setOcrMatch(null)
    setOcrExtractedText('')
    setResidentId('')
  }

  async function triggerOcr(file: File) {
    setOcrStatus('loading')
    setOcrMatch(null)
    setResidentId('')

    const fd = new FormData()
    fd.append('file', file)

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)

      const res = await fetch('/api/ocr', { method: 'POST', body: fd, signal: controller.signal })
      clearTimeout(timeout)

      const data = await res.json()

      if (data.match && data.confidence !== 'low') {
        setOcrMatch(data.match)
        setOcrExtractedText(data.extracted_text ?? '')
        setOcrStatus('matched')
      } else {
        // No match or low confidence → go straight to manual select
        setOcrStatus('not_found')
      }
    } catch {
      // Timeout or network error — silent fallback to manual
      setOcrStatus('error')
    }
  }

  function handleFile(file: File | null) {
    if (!file) return
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
    setError('')
    resetOcr()
    triggerOcr(file)
  }

  function clearPhoto() {
    setPhoto(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    resetOcr()
    setError('')
  }

  function handleOcrConfirm() {
    if (!ocrMatch) return
    setResidentId(ocrMatch.value)
    setOcrStatus('confirmed')
  }

  function handleOcrReject() {
    setResidentId('')
    setOcrStatus('rejected')
  }

  function handleOcrChange() {
    setResidentId('')
    setOcrStatus('rejected')
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

  const showManualSelect =
    ocrStatus === 'not_found' ||
    ocrStatus === 'rejected' ||
    ocrStatus === 'error' ||
    ocrStatus === 'idle'

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
          <div className={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
            {/* Preview com contain para ver a etiqueta inteira */}
            <div className={css({
              position: 'relative',
              borderRadius: 'xl',
              overflow: 'hidden',
              bg: 'gray.100',
              minH: '200px',
              maxH: '360px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              _dark: { bg: 'gray.800' },
            })}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Preview"
                className={css({ maxW: 'full', maxH: '360px', objectFit: 'contain' })}
              />
              {ocrStatus === 'loading' && (
                <div className={css({
                  position: 'absolute',
                  inset: '0',
                  bg: 'blackAlpha.600',
                  display: 'flex',
                  flexDir: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2',
                })}>
                  <Loader2 size={28} className={css({ color: 'white', animation: 'spin 1s linear infinite' })} />
                  <span className={css({ color: 'white', fontSize: 'sm', fontWeight: 'medium' })}>
                    Identificando destinatário…
                  </span>
                </div>
              )}
            </div>
            {/* Ação da foto */}
            <button
              type="button"
              onClick={clearPhoto}
              className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '1',
                fontSize: 'xs',
                color: 'red.500',
                cursor: 'pointer',
                alignSelf: 'flex-start',
                _hover: { color: 'red.700' },
                _dark: { color: 'red.400', _hover: { color: 'red.300' } },
              })}
            >
              <Trash2 size={13} />
              Remover imagem
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

      {/* Morador destinatário */}
      <div className={css({ display: 'flex', flexDir: 'column', gap: '3' })}>
        <span className={css({ fontSize: 'sm', fontWeight: 'medium', color: 'gray.700', _dark: { color: 'gray.300' } })}>
          Morador destinatário <span className={css({ color: 'red.500' })}>*</span>
        </span>

        {/* OCR loading */}
        {ocrStatus === 'loading' && (
          <div className={css({
            display: 'flex',
            alignItems: 'center',
            gap: '2',
            fontSize: 'sm',
            color: 'gray.500',
            _dark: { color: 'gray.400' },
          })}>
            <Loader2 size={14} className={css({ animation: 'spin 1s linear infinite', flexShrink: '0' })} />
            Identificando destinatário…
          </div>
        )}

        {/* OCR: match encontrado — aguardando confirmação */}
        {ocrStatus === 'matched' && ocrMatch && (
          <div className={css({
            border: '1px solid',
            borderColor: 'blue.200',
            borderRadius: 'lg',
            p: '4',
            bg: 'blue.50',
            display: 'flex',
            flexDir: 'column',
            gap: '3',
            _dark: { bg: 'blue.950', borderColor: 'blue.800' },
          })}>
            <div className={css({ display: 'flex', alignItems: 'flex-start', gap: '3' })}>
              <UserCheck size={20} className={css({ color: 'blue.600', flexShrink: '0', mt: '0.5', _dark: { color: 'blue.400' } })} />
              <div className={css({ display: 'flex', flexDir: 'column', gap: '0.5' })}>
                <span className={css({ fontSize: 'xs', fontWeight: 'medium', color: 'blue.600', _dark: { color: 'blue.400' } })}>
                  Destinatário identificado
                </span>
                <span className={css({ fontSize: 'sm', fontWeight: 'semibold', color: 'gray.900', _dark: { color: 'gray.50' } })}>
                  {ocrMatch.label}
                </span>
                {ocrExtractedText && (
                  <span className={css({ fontSize: 'xs', color: 'gray.500', _dark: { color: 'gray.400' } })}>
                    Texto lido: &ldquo;{ocrExtractedText}&rdquo;
                  </span>
                )}
              </div>
            </div>
            <div className={css({ display: 'flex', gap: '3', flexWrap: 'wrap' })}>
              <button
                type="button"
                onClick={handleOcrConfirm}
                className={css({
                  display: 'flex', alignItems: 'center', gap: '2',
                  px: '4', py: '2',
                  bg: 'green.600', color: 'white',
                  borderRadius: 'lg', fontSize: 'sm', fontWeight: 'semibold',
                  cursor: 'pointer',
                  _hover: { bg: 'green.700' },
                  _dark: { bg: 'green.700', _hover: { bg: 'green.600' } },
                })}
              >
                <CheckCircle2 size={15} />
                Sim, é este morador
              </button>
              <button
                type="button"
                onClick={handleOcrReject}
                className={css({
                  display: 'flex', alignItems: 'center', gap: '2',
                  px: '4', py: '2',
                  bg: 'red.50', color: 'red.700',
                  border: '1px solid', borderColor: 'red.300',
                  borderRadius: 'lg', fontSize: 'sm', fontWeight: 'semibold',
                  cursor: 'pointer',
                  _hover: { bg: 'red.100' },
                  _dark: { bg: 'red.950', color: 'red.400', borderColor: 'red.700', _hover: { bg: 'red.900' } },
                })}
              >
                <X size={15} />
                Selecionar morador manualmente
              </button>
            </div>
          </div>
        )}

        {/* OCR: confirmado */}
        {ocrStatus === 'confirmed' && ocrMatch && (
          <div className={css({
            border: '1px solid',
            borderColor: 'green.200',
            borderRadius: 'lg',
            px: '4',
            py: '3',
            bg: 'green.50',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '3',
            _dark: { bg: 'green.950', borderColor: 'green.800' },
          })}>
            <div className={css({ display: 'flex', alignItems: 'center', gap: '2' })}>
              <CheckCircle2 size={16} className={css({ color: 'green.600', flexShrink: '0', _dark: { color: 'green.400' } })} />
              <span className={css({ fontSize: 'sm', fontWeight: 'medium', color: 'gray.900', _dark: { color: 'gray.50' } })}>
                {ocrMatch.label}
              </span>
            </div>
            <button
              type="button"
              onClick={handleOcrChange}
              className={css({
                fontSize: 'xs',
                color: 'gray.500',
                cursor: 'pointer',
                textDecoration: 'underline',
                _hover: { color: 'gray.700' },
                _dark: { color: 'gray.400', _hover: { color: 'gray.200' } },
              })}
            >
              Alterar
            </button>
          </div>
        )}

        {/* OCR: não encontrado */}
        {ocrStatus === 'not_found' && (
          <div className={css({
            display: 'flex',
            alignItems: 'center',
            gap: '2',
            fontSize: 'xs',
            color: 'amber.700',
            bg: 'amber.50',
            borderRadius: 'md',
            px: '3',
            py: '2',
            _dark: { color: 'amber.400', bg: 'amber.950' },
          })}>
            <AlertCircle size={14} className={css({ flexShrink: '0' })} />
            Não identificamos automaticamente. Selecione o morador:
          </div>
        )}

        {/* OCR: rejeitado pelo usuário */}
        {ocrStatus === 'rejected' && (
          <div className={css({
            display: 'flex',
            alignItems: 'center',
            gap: '2',
            fontSize: 'xs',
            color: 'gray.500',
            _dark: { color: 'gray.400' },
          })}>
            <AlertCircle size={14} className={css({ flexShrink: '0' })} />
            Selecione o morador correto:
          </div>
        )}

        {/* Select manual */}
        {showManualSelect && (
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
        )}
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
        <Button type="submit" disabled={loading || ocrStatus === 'loading'}>
          {loading ? 'Registrando…' : 'Registrar chegada'}
        </Button>
      </div>
    </form>
  )
}
