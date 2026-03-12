'use client'

import { css, cx } from '@encoraj/styled-system/css'
import { Button } from '../../atoms/Button'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'warning' | 'danger'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const borderClass: Record<NonNullable<ConfirmDialogProps['variant']>, string> = {
  warning: css({ borderLeftColor: 'yellow.500' }),
  danger:  css({ borderLeftColor: 'red.500' }),
}

const iconClass: Record<NonNullable<ConfirmDialogProps['variant']>, string> = {
  warning: css({ color: 'yellow.500' }),
  danger:  css({ color: 'red.500' }),
}

function IconWarning() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="28" height="28" aria-hidden>
      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  )
}

function IconDanger() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="28" height="28" aria-hidden>
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
    </svg>
  )
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'warning',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className={css({
        position: 'fixed',
        inset: '0',
        zIndex: '10000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: '4',
      })}
    >
      {/* Backdrop */}
      <div
        onClick={onCancel}
        className={css({
          position: 'absolute',
          inset: '0',
          bg: 'black/50',
          backdropFilter: 'blur(2px)',
        })}
      />

      {/* Dialog */}
      <div
        className={cx(
          css({
            position: 'relative',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '4',
            bg: 'white',
            borderRadius: 'xl',
            borderLeft: '6px solid',
            boxShadow: 'xl',
            px: '6',
            py: '5',
            w: 'full',
            maxW: '440px',
            _dark: { bg: 'gray.800' },
          }),
          borderClass[variant],
        )}
        style={{ animation: 'toast-in 0.2s ease forwards' }}
      >
        {/* Icon */}
        <span className={cx(css({ flexShrink: 0, mt: '0.5' }), iconClass[variant])}>
          {variant === 'danger' ? <IconDanger /> : <IconWarning />}
        </span>

        {/* Content */}
        <div className={css({ flex: 1, display: 'flex', flexDir: 'column', gap: '4' })}>
          <div className={css({ display: 'flex', flexDir: 'column', gap: '1' })}>
            <p
              id="confirm-dialog-title"
              className={css({ fontSize: 'sm', fontWeight: 'semibold', color: 'gray.900', _dark: { color: 'gray.50' } })}
            >
              {title}
            </p>
            <p className={css({ fontSize: 'lg', color: 'gray.700', lineHeight: '1.4', _dark: { color: 'gray.300' } })}>
              {message}
            </p>
          </div>

          <div className={css({ display: 'flex', gap: '2', justifyContent: 'flex-end' })}>
            <Button
              variant="outline"
              intent="secondary"
              size="sm"
              onClick={onCancel}
              disabled={loading}
            >
              {cancelLabel}
            </Button>
            <Button
              intent={variant === 'danger' ? 'danger' : 'primary'}
              size="sm"
              onClick={onConfirm}
              loading={loading}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
