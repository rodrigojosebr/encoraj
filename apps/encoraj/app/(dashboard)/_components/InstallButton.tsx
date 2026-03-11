'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, Share, X } from 'lucide-react'
import { css } from '@/styled-system/css'

type Platform = 'android' | 'ios' | 'none'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallButton({ collapsed }: { collapsed: boolean }) {
  const [platform, setPlatform] = useState<Platform>('none')
  const [showIOSHint, setShowIOSHint] = useState(false)
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)
  const hintRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Se já está instalado, não mostra nada
    if (window.matchMedia('(display-mode: standalone)').matches) return

    // iOS: mostra o botão imediatamente
    const ua = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream
    if (isIOS) {
      setPlatform('ios')
      return
    }

    // Android: aguarda o evento do browser
    function handlePrompt(e: Event) {
      e.preventDefault()
      deferredPrompt.current = e as BeforeInstallPromptEvent
      setPlatform('android')
    }

    window.addEventListener('beforeinstallprompt', handlePrompt)
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt)
  }, [])

  // Fecha o hint iOS ao clicar fora
  useEffect(() => {
    if (!showIOSHint) return
    function handleClickOutside(e: MouseEvent) {
      if (hintRef.current && !hintRef.current.contains(e.target as Node)) {
        setShowIOSHint(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showIOSHint])

  async function handleAndroid() {
    if (!deferredPrompt.current) return
    await deferredPrompt.current.prompt()
    const { outcome } = await deferredPrompt.current.userChoice
    if (outcome === 'accepted') {
      deferredPrompt.current = null
      setPlatform('none')
    }
  }

  if (platform === 'none') return null

  const btnCss = css({
    display: 'flex',
    alignItems: 'center',
    gap: '2',
    px: '2',
    py: '1.5',
    borderRadius: 'md',
    fontSize: 'sm',
    fontWeight: 'medium',
    color: 'blue.600',
    bg: 'blue.50',
    border: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    _hover: { bg: 'blue.100' },
    _dark: { color: 'blue.400', bg: 'blue.950', _hover: { bg: 'blue.900' } },
  })

  if (platform === 'android') {
    return (
      <button
        type="button"
        onClick={handleAndroid}
        title="Instalar app"
        className={btnCss}
      >
        <Download size={16} strokeWidth={2} />
        {!collapsed && <span>Instalar app</span>}
      </button>
    )
  }

  // iOS
  return (
    <div style={{ position: 'relative' }} ref={hintRef}>
      <button
        type="button"
        onClick={() => setShowIOSHint(v => !v)}
        title="Instalar app"
        className={btnCss}
      >
        <Download size={16} strokeWidth={2} />
        {!collapsed && <span>Instalar app</span>}
      </button>

      {showIOSHint && (
        <div
          className={css({
            position: 'absolute',
            bottom: '110%',
            left: '0',
            bg: 'white',
            border: '1px solid',
            borderColor: 'gray.200',
            borderRadius: 'xl',
            p: '4',
            shadow: 'lg',
            w: '240px',
            zIndex: '100',
            _dark: { bg: 'gray.800', borderColor: 'gray.700' },
          })}
        >
          <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: '2' })}>
            <p className={css({ fontSize: 'sm', fontWeight: 'semibold', color: 'gray.900', _dark: { color: 'gray.50' } })}>
              Instalar no iPhone
            </p>
            <button
              type="button"
              onClick={() => setShowIOSHint(false)}
              className={css({ color: 'gray.400', bg: 'none', border: 'none', cursor: 'pointer', p: '0', _hover: { color: 'gray.600' } })}
            >
              <X size={14} />
            </button>
          </div>
          <ol className={css({ display: 'flex', flexDir: 'column', gap: '2', pl: '0', listStyle: 'none' })}>
            <li className={css({ display: 'flex', alignItems: 'center', gap: '2', fontSize: 'sm', color: 'gray.600', _dark: { color: 'gray.300' } })}>
              <span className={css({ color: 'blue.500', flexShrink: '0' })}><Share size={15} /></span>
              Toque em <strong>Compartilhar</strong>
            </li>
            <li className={css({ fontSize: 'sm', color: 'gray.600', pl: '5', _dark: { color: 'gray.300' } })}>
              Depois em <strong>&quot;Adicionar à Tela de Início&quot;</strong>
            </li>
          </ol>
        </div>
      )}
    </div>
  )
}
