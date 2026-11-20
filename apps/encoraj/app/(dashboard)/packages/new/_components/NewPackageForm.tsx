'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { css } from '@/styled-system/css'
import { Button, FormField, useToast } from '@encoraj/ui'
import { compressImage } from '../../../_lib/compress-image'
import LabelPhotoPicker from './LabelPhotoPicker'
import RecipientPicker, { type OcrStatus, type ResidentOption } from './RecipientPicker'

/** Tempo máximo do OCR: passou disso, o porteiro escolhe na lista e segue. */
const OCR_TIMEOUT_MS = 15000

export default function NewPackageForm({ residents }: { residents: ResidentOption[] }) {
  const router = useRouter()
  const { toast } = useToast()

  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [residentId, setResidentId] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), OCR_TIMEOUT_MS)
    try {
      const res = await fetch('/api/ocr', { method: 'POST', body: fd, signal: controller.signal })
      const data = await res.json()

      if (data.match && data.confidence !== 'low') {
        setOcrMatch(data.match)
        setOcrExtractedText(data.extracted_text ?? '')
        setOcrStatus('matched')
      } else {
        // Sem sugestão ou confiança baixa → direto para a lista
        setOcrStatus('not_found')
      }
    } catch {
      // Tempo esgotado ou falha de rede: segue na lista, sem travar a portaria
      setOcrStatus('error')
    } finally {
      clearTimeout(timeout)
    }
  }

  async function handleFile(original: File) {
    // Reduz antes de tudo: o mesmo arquivo menor vai para o OCR e para o upload
    const file = await compressImage(original)
    if (preview) URL.revokeObjectURL(preview)
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

  function confirmOcrMatch() {
    if (!ocrMatch) return
    setResidentId(ocrMatch.value)
    setOcrStatus('confirmed')
  }

  function rejectOcrMatch() {
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
      // 1. Sobe a foto
      const fd = new FormData()
      fd.append('file', photo)
      const upRes = await fetch('/api/upload', { method: 'POST', body: fd })
      const upData = await upRes.json()
      if (!upRes.ok) { setError(upData.error ?? 'Erro ao enviar foto.'); setLoading(false); return }

      // 2. Cria a encomenda
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
      <LabelPhotoPicker preview={preview} analyzing={ocrStatus === 'loading'} onFile={handleFile} onClear={clearPhoto} />

      <RecipientPicker
        residents={residents}
        residentId={residentId}
        onResidentChange={setResidentId}
        ocrStatus={ocrStatus}
        ocrMatch={ocrMatch}
        ocrExtractedText={ocrExtractedText}
        onConfirm={confirmOcrMatch}
        onReject={rejectOcrMatch}
      />

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
