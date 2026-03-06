import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './Providers'

export const metadata: Metadata = {
  title: 'Encoraj',
  description: 'Sistema de gestão de encomendas para condomínios',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
