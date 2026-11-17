import type { NextConfig } from 'next'
import withPWAInit from '@ducanh2912/next-pwa'

const withPWA = withPWAInit({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
  },
})

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
]

// CSP em modo relatório: o navegador só AVISA no console o que seria bloqueado, sem
// quebrar nada. Depois de navegar pelo app sem avisos, trocar o nome do header para
// 'Content-Security-Policy' para passar a valer.
const cspReportOnly = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.amazonaws.com",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const nextConfig: NextConfig = {
  transpilePackages: ['@encoraj/ui'],
  images: { remotePatterns: [{ protocol: 'https', hostname: '**.amazonaws.com' }] },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [...securityHeaders, { key: 'Content-Security-Policy-Report-Only', value: cspReportOnly }],
      },
      {
        // Página pública da encomenda: o token está na URL — não indexar nem vazar por Referer
        source: '/p/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Cache-Control', value: 'private, no-store' },
        ],
      },
    ]
  },
}

export default withPWA(nextConfig)
