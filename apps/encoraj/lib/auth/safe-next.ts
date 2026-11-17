/**
 * Destino pós-login vindo de `?next=`. Só aceita caminho interno:
 * `//host` e `/\host` sairiam do site (open redirect).
 */
export function safeNextPath(next: string | null | undefined): string {
  return next && /^\/(?![/\\])/.test(next) ? next : '/'
}
