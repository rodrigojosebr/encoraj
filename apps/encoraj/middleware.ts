import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import { AUTH_COOKIE } from '@/lib/auth/cookies'

// Rotas que exigem role mínima
const ROLE_ROUTES: Array<{ prefix: string; roles: string[] }> = [
  { prefix: '/users', roles: ['admin'] },
  { prefix: '/settings', roles: ['admin'] },
  { prefix: '/reports', roles: ['admin', 'sindico'] },
  { prefix: '/residents', roles: ['admin', 'zelador'] },
  { prefix: '/packages', roles: ['admin', 'porteiro'] },
]

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

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Nunca confiar em header de identidade vindo do cliente
  const requestHeaders = new Headers(request.headers)
  for (const name of IDENTITY_HEADERS) requestHeaders.delete(name)

  // Rotas públicas — deixa passar (sem identidade)
  if (
    matchesPrefix(pathname, '/login') ||
    matchesPrefix(pathname, '/register') ||
    matchesPrefix(pathname, '/forgot-password') ||
    matchesPrefix(pathname, '/reset-password') ||
    pathname.startsWith('/p/') ||
    matchesPrefix(pathname, '/api/auth') ||
    matchesPrefix(pathname, '/api/register')
  ) {
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  const isApi = pathname.startsWith('/api/')

  // Verifica token
  const token = request.cookies.get(AUTH_COOKIE)?.value

  if (!token) {
    if (isApi) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  let payload
  try {
    payload = await verifyToken(token)
  } catch {
    const response = isApi
      ? NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url))
    response.cookies.set(AUTH_COOKIE, '', { maxAge: 0, path: '/' })
    return response
  }

  // JWT sem condo_id = token emitido antes do multi-tenancy → forçar novo login
  if (!payload.condo_id) {
    const response = isApi
      ? NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url))
    response.cookies.set(AUTH_COOKIE, '', { maxAge: 0, path: '/' })
    return response
  }

  // Verifica permissão por role para rotas do dashboard
  for (const route of ROLE_ROUTES) {
    if (matchesPrefix(pathname, route.prefix) && !route.roles.includes(payload.role)) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Identidade NÃO vai por header: rotas e páginas verificam o cookie por conta própria
  // (lib/auth/session.ts). O middleware só barra cedo e aplica role de página.
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
}
