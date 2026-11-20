import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import { AUTH_COOKIE, clearSessionCookie } from '@/lib/auth/cookies'
import { tokenRoles } from '@/lib/auth/roles'
import { can, PAGE_PERMISSIONS } from '@/lib/auth/permissions'

// Headers de identidade de versões antigas: ninguém mais lê, e o cliente não pode enviá-los
const IDENTITY_HEADERS = [
  'x-user-id',
  'x-user-name',
  'x-user-role',
  'x-condo-id',
  'x-condo-name',
  'x-user-photo',
  'x-condo-photo',
  'x-token-iat',
]

// Arquivos do PWA: o navegador busca sem cookie (manifest, ícones) ou antes do login (service worker)
const PUBLIC_ASSET = /^\/(sw\.js|offline\.html|manifest\.webmanifest|icon|apple-icon|icon-[\w-]+\.png)$/

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

/**
 * Primeira barreira de acesso (Next 16: `proxy`, roda em Node). Não é a única:
 * rotas e páginas verificam o cookie por conta própria em lib/auth/session.ts.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Nunca confiar em header de identidade vindo do cliente
  const requestHeaders = new Headers(request.headers)
  for (const name of IDENTITY_HEADERS) requestHeaders.delete(name)

  // Rotas públicas — deixa passar (sem identidade)
  if (
    PUBLIC_ASSET.test(pathname) ||
    matchesPrefix(pathname, '/login') ||
    matchesPrefix(pathname, '/forgot-password') ||
    matchesPrefix(pathname, '/reset-password') ||
    matchesPrefix(pathname, '/termos') ||
    matchesPrefix(pathname, '/privacidade') ||
    pathname.startsWith('/p/') ||
    matchesPrefix(pathname, '/api/auth')
  ) {
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  const isApi = pathname.startsWith('/api/')

  // Verifica token
  const token = request.cookies.get(AUTH_COOKIE)?.value

  if (!token) {
    if (isApi) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  let payload
  try {
    payload = await verifyToken(token)
  } catch {
    const response = isApi
      ? NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url))
    clearSessionCookie(response)
    return response
  }

  // JWT sem condo_id = token emitido antes do multi-tenancy → forçar novo login
  if (!payload.condo_id) {
    const response = isApi
      ? NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url))
    clearSessionCookie(response)
    return response
  }

  // Verifica permissão por role para rotas do dashboard
  // Telas de plataforma: só super admin. (As rotas /api/admin conferem por conta própria.)
  // Permissão por página, pela mesma tabela que as rotas e o menu usam (roles se somam)
  const subject = { roles: tokenRoles(payload) }
  for (const page of PAGE_PERMISSIONS) {
    if (matchesPrefix(pathname, page.prefix) && !can(subject, page.permission)) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Identidade NÃO vai por header: rotas e páginas verificam o cookie por conta própria
  // (lib/auth/session.ts). O proxy só barra cedo e aplica a permissão de página.
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
}
