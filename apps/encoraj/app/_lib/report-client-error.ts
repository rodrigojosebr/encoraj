/**
 * Avisa o servidor de um erro que estourou na tela (usado pelos error.tsx).
 * Falha em silêncio: se nem isto funcionar, não há o que fazer do lado do usuário.
 */
export function reportClientError(error: unknown): void {
  const digest =
    typeof error === 'object' && error !== null && 'digest' in error ? String(error.digest) : undefined
  const message = error instanceof Error ? error.message : String(error)

  fetch('/api/client-errors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: message.slice(0, 500) || 'Erro sem mensagem',
      digest,
      path: window.location.pathname,
    }),
    keepalive: true,
  }).catch(() => {})
}
