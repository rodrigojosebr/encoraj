'use client'

import { X, CheckCircle2, AlertCircle, Loader2, UserCheck } from 'lucide-react'
import { css } from '@/styled-system/css'

export interface ResidentOption {
  value: string
  label: string
}

/** Etapas da leitura da etiqueta: o OCR sugere, o porteiro confirma ou escolhe na lista. */
export type OcrStatus = 'idle' | 'loading' | 'matched' | 'confirmed' | 'rejected' | 'not_found' | 'error'

interface RecipientPickerProps {
  residents: ResidentOption[]
  residentId: string
  onResidentChange: (id: string) => void
  ocrStatus: OcrStatus
  ocrMatch: ResidentOption | null
  ocrExtractedText: string
  onConfirm: () => void
  /** "Selecionar manualmente" ou "Alterar": volta para a lista */
  onReject: () => void
}

/** Morador destinatário: sugestão do OCR para confirmar, ou seleção manual. */
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
  const showManualSelect = ocrStatus === 'not_found' || ocrStatus === 'rejected' || ocrStatus === 'error' || ocrStatus === 'idle'

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

      {/* Sugestão confirmada */}
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
            onClick={onReject}
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

      {ocrStatus === 'rejected' && (
        <div className={css({ display: 'flex', alignItems: 'center', gap: '2', fontSize: 'xs', color: 'gray.500', _dark: { color: 'gray.400' } })}>
          <AlertCircle size={14} className={css({ flexShrink: '0' })} />
          Selecione o morador correto:
        </div>
      )}

      {showManualSelect && (
        <select
          value={residentId}
          onChange={(e) => onResidentChange(e.target.value)}
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
  )
}
