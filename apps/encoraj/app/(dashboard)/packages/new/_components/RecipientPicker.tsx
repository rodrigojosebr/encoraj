'use client'

import { X, CheckCircle2, AlertCircle, Loader2, UserCheck } from 'lucide-react'
import { css } from '@/styled-system/css'
import ResidentSearch, { type ResidentChoice } from './ResidentSearch'

/** O que basta para mostrar um morador: é o que o OCR devolve. */
export interface ResidentOption {
  value: string
  label: string
}

/** Etapas da leitura da etiqueta: o OCR sugere, o porteiro confirma ou busca o morador. */
export type OcrStatus = 'idle' | 'loading' | 'matched' | 'confirmed' | 'rejected' | 'not_found' | 'error'

interface RecipientPickerProps {
  residents: ResidentChoice[]
  residentId: string
  onResidentChange: (id: string) => void
  ocrStatus: OcrStatus
  ocrMatch: ResidentOption | null
  ocrExtractedText: string
  onConfirm: () => void
  /** "Selecionar manualmente" ou "Alterar": volta para a busca */
  onReject: () => void
}

/** Morador já escolhido (pelo OCR ou pela busca), com o caminho para trocar. */
function SelectedResident({ label, onChange }: { label: string; onChange: () => void }) {
  return (
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
          {label}
        </span>
      </div>
      <button
        type="button"
        onClick={onChange}
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
  )
}

/** Morador destinatário: sugestão do OCR para confirmar, ou busca por nome ou unidade. */
export default function RecipientPicker({
  residents,
  residentId,
  onResidentChange,
  ocrStatus,
  ocrMatch,
  ocrExtractedText,
  onConfirm,
  onReject,
}: RecipientPickerProps) {
  const manual = ocrStatus === 'not_found' || ocrStatus === 'rejected' || ocrStatus === 'error' || ocrStatus === 'idle'
  const selected = manual ? residents.find((r) => r.value === residentId) : undefined

  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '3' })}>
      <span className={css({ fontSize: 'sm', fontWeight: 'medium', color: 'gray.700', _dark: { color: 'gray.300' } })}>
        Morador destinatário <span className={css({ color: 'red.500' })}>*</span>
      </span>

      {ocrStatus === 'loading' && (
        <div className={css({ display: 'flex', alignItems: 'center', gap: '2', fontSize: 'sm', color: 'gray.500', _dark: { color: 'gray.400' } })}>
          <Loader2 size={14} className={css({ animation: 'spin 1s linear infinite', flexShrink: '0' })} />
          Identificando destinatário…
        </div>
      )}

      {/* Sugestão encontrada — aguardando confirmação */}
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
              onClick={onConfirm}
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
              onClick={onReject}
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

      {ocrStatus === 'confirmed' && ocrMatch && <SelectedResident label={ocrMatch.label} onChange={onReject} />}

      {ocrStatus === 'not_found' && !selected && (
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
          Não identificamos automaticamente. Busque o morador:
        </div>
      )}

      {ocrStatus === 'rejected' && !selected && (
        <div className={css({ display: 'flex', alignItems: 'center', gap: '2', fontSize: 'xs', color: 'gray.500', _dark: { color: 'gray.400' } })}>
          <AlertCircle size={14} className={css({ flexShrink: '0' })} />
          Busque o morador correto:
        </div>
      )}

      {selected && <SelectedResident label={selected.label} onChange={() => onResidentChange('')} />}
      {manual && !selected && <ResidentSearch residents={residents} onSelect={onResidentChange} />}
    </div>
  )
}
