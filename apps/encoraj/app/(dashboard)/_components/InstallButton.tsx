'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, Share, X } from 'lucide-react'
import { css } from '@/styled-system/css'

type Platform = 'android' | 'android-manual' | 'ios' | 'none'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'encoraj-install-dismissed'

export default function InstallButton({ collapsed }: { collapsed: boolean }) {
  const [platform, setPlatform] = useState<Platform>('none')
  const [showHint, setShowHint] = useState(false)
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)
  const hintRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (localStorage.getItem(DISMISSED_KEY)) return

    const ua = navigator.userAgent

    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream
    if (isIOS) {
      setPlatform('ios')
      return
    }

    const isAndroid = /Android/.test(ua)
    if (isAndroid) setPlatform('android-manual')

    function handlePrompt(e: Event) {
      e.preventDefault()
      deferredPrompt.current = e as BeforeInstallPromptEvent
      setPlatform('android')
    }

    window.addEventListener('beforeinstallprompt', handlePrompt)
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt)
  }, [])

  // Fecha hint ao clicar fora
  useEffect(() => {
    if (!showHint) return
    function handleClickOutside(e: MouseEvent) {
      if (hintRef.current && !hintRef.current.contains(e.target as Node)) {
        setShowHint(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showHint])

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setPlatform('none')
    setShowHint(false)
  }

  async function handleAndroid() {
    if (!deferredPrompt.current) return
    await deferredPrompt.current.prompt()
    const { outcome } = await deferredPrompt.current.userChoice
    if (outcome === 'accepted') {
      dismiss()
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

  const dismissBtnCss = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'blue.400',
    bg: 'none',
    border: 'none',
    cursor: 'pointer',
    p: '0.5',
    borderRadius: 'sm',
    flexShrink: '0',
    _hover: { color: 'blue.600' },
    _dark: { color: 'blue.600', _hover: { color: 'blue.400' } },
  })

  const hintCss = css({
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
  })

  const hintTitleCss = css({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    mb: '2',
  })

  const hintHeadingCss = css({
    fontSize: 'sm',
    fontWeight: 'semibold',
    color: 'gray.900',
    _dark: { color: 'gray.50' },
  })

  const hintCloseCss = css({
    color: 'gray.400',
    bg: 'none',
    border: 'none',
    cursor: 'pointer',
    p: '0',
    _hover: { color: 'gray.600' },
  })

  const hintListCss = css({
    display: 'flex',
    flexDir: 'column',
    gap: '2',
    pl: '0',
    listStyle: 'none',
  })

  const hintItemCss = css({
    fontSize: 'sm',
    color: 'gray.600',
    _dark: { color: 'gray.300' },
  })

  // Android nativo — usa prompt do browser
  if (platform === 'android') {
    return (
      <div className={css({ display: 'flex', alignItems: 'center', gap: '1' })}>
        <button type="button" onClick={handleAndroid} title="Instalar app" className={btnCss}>
          <Download size={16} strokeWidth={2} />
          {!collapsed && <span>Instalar app</span>}
        </button>
        {!collapsed && (
          <button type="button" onClick={dismiss} title="Não mostrar mais" className={dismissBtnCss}>
            <X size={13} />
          </button>
        )}
      </div>
    )
  }

  // Android manual — instrução pelo menu do Chrome
  if (platform === 'android-manual') {
    return (
      <div className={css({ display: 'flex', alignItems: 'center', gap: '1' })} ref={hintRef}>
        <button
          type="button"
          onClick={() => setShowHint(v => !v)}
          title="Instalar app"
          className={btnCss}
        >
          <Download size={16} strokeWidth={2} />
          {!collapsed && <span>Instalar app</span>}
        </button>
        {!collapsed && (
          <button type="button" onClick={dismiss} title="Não mostrar mais" className={dismissBtnCss}>
            <X size={13} />
          </button>
        )}
        {showHint && (
          <div className={hintCss}>
            <div className={hintTitleCss}>
              <p className={hintHeadingCss}>Instalar no Android</p>
              <button type="button" onClick={() => setShowHint(false)} className={hintCloseCss}>
                <X size={14} />
              </button>
            </div>
            <ol className={hintListCss}>
              <li className={hintItemCss}>
                No Chrome, toque em <strong>⋮</strong> (três pontos)
              </li>
              <li className={hintItemCss}>
                Depois em <strong>&quot;Adicionar à tela inicial&quot;</strong>
              </li>
            </ol>
          </div>
        )}
      </div>
    )
  }

  // iOS — instrução pelo Safari
  return (
    <div className={css({ display: 'flex', alignItems: 'center', gap: '1' })} ref={hintRef}>
      <button
        type="button"
        onClick={() => setShowHint(v => !v)}
        title="Instalar app"
        className={btnCss}
      >
        <Download size={16} strokeWidth={2} />
        {!collapsed && <span>Instalar app</span>}
      </button>
      {!collapsed && (
        <button type="button" onClick={dismiss} title="Não mostrar mais" className={dismissBtnCss}>
          <X size={13} />
        </button>
      )}
      {showHint && (
        <div className={hintCss}>
          <div className={hintTitleCss}>
            <p className={hintHeadingCss}>Instalar no iPhone</p>
            <button type="button" onClick={() => setShowHint(false)} className={hintCloseCss}>
              <X size={14} />
            </button>
          </div>
          <ol className={hintListCss}>
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
