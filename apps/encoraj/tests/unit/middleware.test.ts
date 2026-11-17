import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { middleware } from '@/middleware'
import { signToken, type JwtPayload } from '@/lib/auth/jwt'
import { AUTH_COOKIE } from '@/lib/auth/cookies'

const base: JwtPayload = {
  sub: '507f1f77bcf86cd799439011',
  name: 'José Ação 🚀',
  role: 'admin',
  condo_id: '507f1f77bcf86cd799439012',
  condo_name: 'Condomínio – Demo',
}

async function request(path: string, opts: { role?: string; token?: string; headers?: Record<string, string> } = {}) {
  const token = opts.token ?? (opts.role ? await signToken({ ...base, role: opts.role }) : undefined)
  return new NextRequest(`http://localhost${path}`, {
    headers: { ...(token ? { cookie: `${AUTH_COOKIE}=${token}` } : {}), ...opts.headers },
  })
}

/** NextResponse.next() marca a resposta com este header. */
const passed = (res: Response) => res.headers.get('x-middleware-next') === '1'
const location = (res: Response) => new URL(res.headers.get('location')!)

describe('middleware', () => {
  it.each(['/login', '/register', '/forgot-password', '/reset-password', '/termos', '/privacidade', '/p/abc', '/api/register'])(
    'deixa passar a rota pública %s sem cookie',
    async (path) => {
      expect(passed(await middleware(await request(path)))).toBe(true)
    },
  )

  it('não trata como pública uma rota que só começa igual', async () => {
    const res = await middleware(await request('/loginfalso'))
    expect(passed(res)).toBe(false)
    expect(location(res).pathname).toBe('/login')
  })

  it('página sem cookie → redirect para /login com next', async () => {
    const res = await middleware(await request('/packages/123'))
    expect(location(res).pathname).toBe('/login')
    expect(location(res).searchParams.get('next')).toBe('/packages/123')
  })

  it('API sem cookie → 401 JSON, não redirect', async () => {
    const res = await middleware(await request('/api/users'))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Não autenticado' })
  })

  it('token inválido → limpa o cookie', async () => {
    const page = await middleware(await request('/packages', { token: 'lixo' }))
    expect(location(page).pathname).toBe('/login')
    expect(page.cookies.get(AUTH_COOKIE)?.value).toBe('')

    const api = await middleware(await request('/api/users', { token: 'lixo' }))
    expect(api.status).toBe(401)
    expect(api.cookies.get(AUTH_COOKIE)?.value).toBe('')
  })

  it('token sem condo_id → força novo login', async () => {
    const token = await signToken({ ...base, condo_id: '' })
    const res = await middleware(await request('/packages', { token }))
    expect(location(res).pathname).toBe('/login')
    expect(res.cookies.get(AUTH_COOKIE)?.value).toBe('')

    const api = await middleware(await request('/api/users', { token }))
    expect(api.status).toBe(401)
  })

  it.each([
    ['/users', 'admin', true],
    ['/users', 'porteiro', false],
    ['/users/abc/edit', 'zelador', false],
    ['/settings', 'sindico', false],
    ['/reports', 'sindico', true],
    ['/reports', 'porteiro', false],
    ['/residents', 'zelador', true],
    ['/residents', 'porteiro', false],
    ['/packages', 'porteiro', true],
    ['/packages/new', 'sindico', false],
    ['/', 'zelador', true],
    ['/profile', 'sindico', true],
  ])('%s com role %s → passa: %s', async (path, role, allowed) => {
    const res = await middleware(await request(path, { role }))
    expect(passed(res)).toBe(allowed)
    if (!allowed) expect(location(res).pathname).toBe('/')
  })

  it('nome com acento e emoji não derruba o middleware', async () => {
    expect(passed(await middleware(await request('/', { role: 'admin' })))).toBe(true)
  })

  it('apaga headers de identidade enviados pelo cliente', async () => {
    const forged = { 'x-user-id': 'forjado', 'x-user-role': 'admin', 'x-condo-id': 'forjado', accept: 'text/html' }

    for (const res of [
      await middleware(await request('/p/abc', { headers: forged })),
      await middleware(await request('/', { role: 'porteiro', headers: forged })),
    ]) {
      // o Next repassa os headers finais do request como x-middleware-request-*
      expect(res.headers.get('x-middleware-request-accept')).toBe('text/html')
      expect(res.headers.get('x-middleware-request-x-user-id')).toBeNull()
      expect(res.headers.get('x-middleware-request-x-user-role')).toBeNull()
      expect(res.headers.get('x-middleware-request-x-condo-id')).toBeNull()
    }
  })
})
