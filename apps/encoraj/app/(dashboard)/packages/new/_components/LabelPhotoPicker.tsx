'use client'

import { useRef } from 'react'
import { Camera, Upload, Loader2, Trash2 } from 'lucide-react'
import { css } from '@/styled-system/css'
import { Button } from '@encoraj/ui'

interface LabelPhotoPickerProps {
  /** URL local da foto escolhida (`URL.createObjectURL`), ou null antes de escolher */
  preview: string | null
  /** Mostra "Identificando destinatário…" sobre a foto enquanto o OCR roda */
  analyzing: boolean
  onFile: (file: File) => void
  onClear: () => void
}

/** Foto da etiqueta: fotografar ou carregar arquivo, com a prévia inteira (sem corte). */
export default function LabelPhotoPicker({ preview, analyzing, onFile, onClear }: LabelPhotoPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // escolher o mesmo arquivo de novo dispara o onChange
    if (file) onFile(file)
  }

  return (
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
            <Button type="button" variant="outline" intent="secondary" size="sm" onClick={() => cameraInputRef.current?.click()}>
              <Camera size={16} />
              Fotografar
            </Button>
            <Button type="button" variant="outline" intent="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
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
            <img src={preview} alt="Preview" className={css({ maxW: 'full', maxH: '360px', objectFit: 'contain' })} />
            {analyzing && (
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
          <button
            type="button"
            onClick={onClear}
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
        onChange={handleChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className={css({ display: 'none' })}
        onChange={handleChange}
      />
    </div>
  )
}
