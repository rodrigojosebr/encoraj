'use client'

import { useEffect, useRef, useState } from 'react'
import { useToast } from '@encoraj/ui'
import { compressImage } from './compress-image'

/** Evento que avisa a barra lateral e o topo do mobile que a foto mudou, sem recarregar. */
export type PhotoEvent = 'user-photo-updated' | 'condo-photo-updated'

/** Formatos aceitos na foto de perfil e do condomínio (o servidor confere pelos bytes). */
export const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp'

/**
 * Trocar e remover foto (perfil, condomínio): reduz no navegador, sobe para `endpoint`
 * (POST/DELETE) e avisa a barra lateral pelo evento `event`, sem recarregar a página.
 */
export function usePhotoUpload(endpoint: string, event: PhotoEvent, initialUrl: string | null) {
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [photoUrl, setPhotoUrl] = useState(initialUrl)
  const [uploading, setUploading] = useState(false)

  function publish(url: string | null) {
    setPhotoUrl(url)
    window.dispatchEvent(new CustomEvent(event, { detail: url }))
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // escolher o mesmo arquivo de novo dispara o onChange
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', await compressImage(file, 512))
      const res = await fetch(endpoint, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        toast({ variant: 'error', message: data.error ?? 'Erro ao enviar foto.' })
        return
      }
      publish(data.photo_url)
      toast({ variant: 'success', message: 'Foto atualizada!' })
    } catch {
      toast({ variant: 'error', message: 'Erro de conexão. Tente novamente.' })
    } finally {
      setUploading(false)
    }
  }

  async function remove() {
    try {
      const res = await fetch(endpoint, { method: 'DELETE' })
      if (!res.ok) {
        toast({ variant: 'error', message: 'Não foi possível remover a foto.' })
        return
      }
      publish(null)
      toast({ variant: 'success', message: 'Foto removida.' })
    } catch {
      toast({ variant: 'error', message: 'Erro de conexão. Tente novamente.' })
    }
  }

  return {
    photoUrl,
    setPhotoUrl,
    uploading,
    inputRef,
    openPicker: () => inputRef.current?.click(),
    onFileChange,
    remove,
  }
}

/** Foto exibida fora da tela de upload (barra lateral, topo do mobile): acompanha o `event`. */
export function usePhotoUpdates(event: PhotoEvent, initialUrl: string | null) {
  const [url, setUrl] = useState(initialUrl)
  useEffect(() => {
    function onUpdate(e: Event) {
      setUrl((e as CustomEvent<string | null>).detail)
    }
    window.addEventListener(event, onUpdate)
    return () => window.removeEventListener(event, onUpdate)
  }, [event])
  return url
}
