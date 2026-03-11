import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import { AUTH_COOKIE } from '@/lib/auth/cookies'

// Rotas que exigem role mínima
const ROLE_ROUTES: Array<{ prefix: string; roles: string[] }> = [
  { prefix: '/users',    roles: ['admin'] },
  { prefix: '/settings', roles: ['admin'] },
  { prefix: '/reports',  roles: ['admin', 'sindico'] },
  { prefix: '/residents', roles: ['admin', 'zelador'] },
  { prefix: '/packages', roles: ['admin', 'porteiro'] },
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas públicas — deixa passar
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/p/') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/register')
  ) {
    return NextResponse.next()
  }

  // Verifica token
  const token = request.cookies.get(AUTH_COOKIE)?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  let payload
  try {
    payload = await verifyToken(token)
  } catch {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.set(AUTH_COOKIE, '', { maxAge: 0, path: '/' })
    return response
  }

  // Verifica permissão por role para rotas do dashboard
  for (const route of ROLE_ROUTES) {
    if (pathname.startsWith(route.prefix)) {
      if (!route.roles.includes(payload.role)) {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }
  }

  // JWT sem condo_id = token emitido antes do multi-tenancy → forçar novo login
  if (!payload.condo_id) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.set(AUTH_COOKIE, '', { maxAge: 0, path: '/' })
    return response
  }

  // Passa o payload no header para Server Components lerem sem re-verificar
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', payload.sub)
  requestHeaders.set('x-user-name', payload.name)
  requestHeaders.set('x-user-role', payload.role)
  requestHeaders.set('x-condo-id', payload.condo_id)
  requestHeaders.set('x-condo-name', payload.condo_name ?? '')
  requestHeaders.set('x-user-photo', payload.photo_url ?? '')
  requestHeaders.set('x-condo-photo', payload.condo_photo_url ?? '')

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
}
