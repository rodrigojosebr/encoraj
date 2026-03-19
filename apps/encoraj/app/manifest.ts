import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Encoraj',
    short_name: 'Encoraj',
    description: 'Gestão de encomendas para condomínios',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    // Abre links do domínio direto no PWA instalado (Android Chrome)
    // @ts-expect-error — handle_links ainda não está nos tipos do Next.js
    handle_links: 'preferred',
    background_color: '#111827',
    theme_color: '#2563eb',
    orientation: 'portrait',
    categories: ['productivity', 'utilities'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
