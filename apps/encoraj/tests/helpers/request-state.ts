/**
 * Estado do "request atual" que o mock de `next/headers` devolve.
 * Sem imports do app aqui: este arquivo é carregado antes das variáveis de ambiente.
 */
export const requestState = {
  headers: new Headers(),
  cookies: new Map<string, string>(),
}

export function resetRequest(): void {
  requestState.headers = new Headers({ 'x-forwarded-for': '10.0.0.1' })
  requestState.cookies = new Map()
}
