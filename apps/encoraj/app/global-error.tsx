'use client'

import { useEffect } from 'react'
import { reportClientError } from './_lib/report-client-error'

/**
 * Último recurso: erro no layout raiz. Substitui o documento inteiro, então traz o
 * próprio <html> e não usa os estilos do app.
 */
export default function GlobalError({ error }: { error: unknown }) {
  useEffect(() => {
    reportClientError(error)
  }, [error])

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          background: '#f9fafb',
          color: '#111827',
          textAlign: 'center',
          padding: 24,
        }}
      >
        <main style={{ maxWidth: 360 }}>
          <h1 style={{ fontSize: '1.25rem', margin: '0 0 8px' }}>Algo deu errado</h1>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.5, color: '#4b5563', margin: '0 0 24px' }}>
            O Encoraj encontrou um erro inesperado. Já fomos avisados. Tente recarregar a página.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              font: 'inherit',
              fontWeight: 600,
              color: '#fff',
              background: '#2563eb',
              border: 0,
              borderRadius: 8,
              padding: '12px 24px',
              cursor: 'pointer',
            }}
          >
            Recarregar
          </button>
        </main>
      </body>
    </html>
  )
}
