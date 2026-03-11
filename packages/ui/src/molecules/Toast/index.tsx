'use client'

import React, { createContext, useCallback, useContext, useRef, useState } from 'react'
import { css, cx } from '@encoraj/styled-system/css'

// ── Types ────────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface ToastOptions {
  variant: ToastVariant
  message: string
  title?: string
  /** milliseconds — default 4000 */
  duration?: number
}

interface ToastItem extends ToastOptions {
  id: string
  exiting: boolean
}

interface ToastContextValue {
  toast: (opts: ToastOptions) => void
  dismiss: (id: string) => void
}

// ── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

// ── Icons ────────────────────────────────────────────────────────────────────

function IconSuccess() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="28" height="28" aria-hidden>
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
    </svg>
  )
}

function IconError() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="28" height="28" aria-hidden>
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
    </svg>
  )
}

function IconWarning() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="28" height="28" aria-hidden>
      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  )
}

function IconInfo() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="28" height="28" aria-hidden>
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
    </svg>
  )
}

const ICONS: Record<ToastVariant, React.ReactNode> = {
  success: <IconSuccess />,
  error:   <IconError />,
  warning: <IconWarning />,
  info:    <IconInfo />,
}

// Pre-computed static Panda classes for runtime-conditional styling
const iconColorClass: Record<ToastVariant, string> = {
  success: css({ color: 'green.500',  flexShrink: 0 }),
  error:   css({ color: 'red.500',    flexShrink: 0 }),
  warning: css({ color: 'yellow.500', flexShrink: 0 }),
  info:    css({ color: 'blue.500',   flexShrink: 0 }),
}

const borderClass: Record<ToastVariant, string> = {
  success: css({ borderLeftColor: 'green.500' }),
  error:   css({ borderLeftColor: 'red.500' }),
  warning: css({ borderLeftColor: 'yellow.500' }),
  info:    css({ borderLeftColor: 'blue.500' }),
}

// ── ToastItem ────────────────────────────────────────────────────────────────

function ToastItemComponent({
  toast,
  onDismiss,
}: {
  toast: ToastItem
  onDismiss: (id: string) => void
}) {
  const ariaLive = toast.variant === 'error' ? 'assertive' : 'polite'
  const role = toast.variant === 'error' ? 'alert' : 'status'

  return (
    <div
      role={role}
      aria-live={ariaLive}
      aria-atomic="true"
      className={cx(
        css({
          display: 'flex',
          alignItems: 'flex-start',
          gap: '4',
          bg: 'white',
          borderRadius: 'xl',
          borderLeft: '6px solid',
          boxShadow: 'xl',
          px: '6',
          py: '5',
          minW: '380px',
          maxW: '520px',
          w: 'full',
          _dark: { bg: 'gray.800' },
        }),
        borderClass[toast.variant],
      )}
      style={{
        animation: toast.exiting
          ? 'toast-out 0.25s ease forwards'
          : 'toast-in 0.25s ease forwards',
      }}
    >
      {/* Icon */}
      <span className={iconColorClass[toast.variant]} style={{ marginTop: '1px' }}>
        {ICONS[toast.variant]}
      </span>

      {/* Content */}
      <div className={css({ flex: 1, minW: 0 })}>
        {toast.title && (
          <p className={css({ fontSize: 'sm', fontWeight: 'semibold', color: 'gray.900', mb: '0.5', _dark: { color: 'gray.50' } })}>
            {toast.title}
          </p>
        )}
        <p className={css({ fontSize: 'lg', color: 'gray.700', lineHeight: '1.4', _dark: { color: 'gray.300' } })}>
          {toast.message}
        </p>
      </div>

      {/* Dismiss */}
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Fechar notificação"
        className={css({
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          w: '6',
          h: '6',
          borderRadius: 'md',
          border: 'none',
          bg: 'transparent',
          color: 'gray.400',
          cursor: 'pointer',
          _hover: { color: 'gray.600', bg: 'gray.100' },
          _dark: { color: 'gray.500', _hover: { color: 'gray.300', bg: 'gray.700' } },
        })}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden>
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>
    </div>
  )
}

// ── ToastContainer ───────────────────────────────────────────────────────────

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}) {
  if (toasts.length === 0) return null

  return (
    <div
      aria-label="Notificações"
      className={css({
        position: 'fixed',
        top: '4',
        right: { base: '4', md: '4' },
        left: { base: '4', md: 'auto' },
        zIndex: '9999',
        display: 'flex',
        flexDir: 'column',
        gap: '3',
        alignItems: { base: 'stretch', md: 'flex-end' },
        pointerEvents: 'none',
      })}
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: 'auto' }}>
          <ToastItemComponent toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  )
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    // Clear auto-dismiss timer if triggered manually
    const t = timers.current.get(id)
    if (t) { clearTimeout(t); timers.current.delete(id) }

    // Mark as exiting → trigger exit animation
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, exiting: true } : t))

    // Remove after animation completes (matches toast-out duration)
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 280)
  }, [])

  const toast = useCallback((opts: ToastOptions) => {
    const id = crypto.randomUUID()
    const duration = opts.duration ?? 4000

    // Keep max 5 toasts
    setToasts((prev) => {
      const next = [...prev.slice(-4), { ...opts, id, exiting: false }]
      return next
    })

    const timer = setTimeout(() => dismiss(id), duration)
    timers.current.set(id, timer)
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
