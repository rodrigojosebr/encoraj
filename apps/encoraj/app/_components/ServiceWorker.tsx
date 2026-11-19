'use client'

import { useEffect } from 'react'

/**
 * Registra o service worker (public/sw.js) — só em produção, para o dev não ficar
 * preso em cache. Registrar no mesmo endereço substitui o service worker antigo do
 * next-pwa nos aparelhos que já tinham o app instalado.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // sem service worker o app funciona igual; só não há tela de "sem conexão"
    })
  }, [])

  return null
}
