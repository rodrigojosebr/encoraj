import type { Metadata } from 'next'
import '@/styled-system/styles.css'

export const metadata: Metadata = {
  title: 'Encoraj',
  description: 'Sistema de gestão de encomendas para condomínios',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
