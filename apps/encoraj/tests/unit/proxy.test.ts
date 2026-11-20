import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from '@/proxy'
import { signToken, type JwtPayload } from '@/lib/auth/jwt'
import { AUTH_COOKIE } from '@/lib/auth/cookies'

const base: JwtPayload = {
  sub: '507f1f77bcf86cd799439011',
  name: 'José Ação 🚀',
  roles: ['admin'],
  condo_id: '507f1f77bcf86cd799439012',
  condo_name: 'Condomínio – Demo',
}

async function request(
  path: string,
  opts: { role?: string; roles?: string[]; token?: string; headers?: Record<string, string> } = {},
) {
  const roles = opts.roles ?? (opts.role ? [opts.role] : undefined)
  const token = opts.token ?? (roles ? await signToken({ ...base, roles }) : undefined)
  return new NextRequest(`http://localhost${path}`, {
    headers: { ...(token ? { cookie: `${AUTH_COOKIE}=${token}` } : {}), ...opts.headers },
  })
}

/** NextResponse.next() marca a resposta com este header. */
const passed = (res: Response) => res.headers.get('x-middleware-next') === '1'
const location = (res: Response) => new URL(res.headers.get('location')!)

describe('proxy', () => {
  it.each(['/login', '/forgot-password', '/reset-password', '/termos', '/privacidade', '/p/abc'])(
    'deixa passar a rota pública %s sem cookie',
    async (path) => {
      expect(passed(await proxy(await request(path)))).toBe(true)
    },
  )

  it.each(['/sw.js', '/offline.html', '/manifest.webmanifest', '/icon', '/apple-icon', '/icon-192.png', '/icon-maskable-512.png'])(
    'arquivo do PWA %s é público (o navegador busca sem cookie)',
    async (path) => {
      expect(passed(await proxy(await request(path)))).toBe(true)
    },
  )

  it.each(['/icon/outra-coisa', '/sw.js.map', '/icons', '/offline.html/x', '/icon-192.png.exe'])(
    'mas %s continua exigindo login',
    async (path) => {
      expect(passed(await proxy(await request(path)))).toBe(false)
    },
  )

  it('cadastro público não existe mais: /register e /api/register exigem login como qualquer rota', async () => {
    expect(location(await proxy(await request('/register'))).pathname).toBe('/login')
    expect((await proxy(await request('/api/register'))).status).toBe(401)
  })

  it('não trata como pública uma rota que só começa igual', async () => {
    const res = await proxy(await request('/loginfalso'))
    expect(passed(res)).toBe(false)
    expect(location(res).pathname).toBe('/login')
  })

  it('página sem cookie → redirect para /login com next', async () => {
    const res = await proxy(await request('/packages/123'))
    expect(location(res).pathname).toBe('/login')
    expect(location(res).searchParams.get('next')).toBe('/packages/123')
  })

  it('API sem cookie → 401 JSON, não redirect', async () => {
    const res = await proxy(await request('/api/users'))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Não autenticado.' })
  })

  it('token inválido → limpa o cookie', async () => {
    const page = await proxy(await request('/packages', { token: 'lixo' }))
    expect(location(page).pathname).toBe('/login')
    expect(page.cookies.get(AUTH_COOKIE)?.value).toBe('')

    const api = await proxy(await request('/api/users', { token: 'lixo' }))
    expect(api.status).toBe(401)
    expect(api.cookies.get(AUTH_COOKIE)?.value).toBe('')
  })

  it('token sem condo_id → força novo login', async () => {
    const token = await signToken({ ...base, condo_id: '' })
    const res = await proxy(await request('/packages', { token }))
    expect(location(res).pathname).toBe('/login')
    expect(res.cookies.get(AUTH_COOKIE)?.value).toBe('')

    const api = await proxy(await request('/api/users', { token }))
    expect(api.status).toBe(401)
  })

  it.each([
    ['/users', 'admin', true],
    ['/users', 'porteiro', false],
    ['/users/abc/edit', 'zelador', false],
    ['/settings', 'sindico', false],
    ['/reports', 'sindico', true],
    ['/reports', 'porteiro', false],
    ['/reports/management', 'sindico', true],
    ['/reports/management', 'zelador', false],
    ['/residents', 'zelador', true],
    ['/residents', 'porteiro', false],
    ['/packages', 'porteiro', true],
    ['/packages/new', 'sindico', false],
    // super admin entra em todas as telas, de plataforma e de condomínio
    ['/users', 'superadmin', true],
    ['/packages', 'superadmin', true],
    ['/settings', 'superadmin', true],
    ['/admin/condos', 'superadmin', true],
    ['/admin/condos', 'admin', false],
    ['/admin/condos', 'administradora', false],
    // administradora: tudo do condomínio + a tela dos condomínios dela
    ['/condos', 'administradora', true],
    ['/users', 'administradora', true],
    ['/reports', 'administradora', true],
    ['/condos', 'admin', false],
    ['/condos', 'sindico', false],
    ['/condos', 'superadmin', true],
    ['/admin/errors', 'superadmin', true],
    ['/admin/ai', 'superadmin', true],
    ['/admin/errors', 'admin', false],
    ['/admin/ai', 'sindico', false],
    ['/admin/permissions', 'superadmin', true],
    ['/admin/permissions', 'admin', false],
    ['/admin/releases', 'superadmin', true],
    ['/admin/releases', 'administradora', false],
    ['/admin', 'porteiro', false],
    ['/', 'zelador', true],
    ['/profile', 'sindico', true],
  ])('%s com role %s → passa: %s', async (path, role, allowed) => {
    const res = await proxy(await request(path, { role }))
    expect(passed(res)).toBe(allowed)
    if (!allowed) expect(location(res).pathname).toBe('/')
  })

  it.each([
    [['zelador', 'porteiro'], '/residents', true],
    [['zelador', 'porteiro'], '/packages', true],
    [['zelador', 'porteiro'], '/users', false],
    [['admin', 'superadmin'], '/users', true],
    [['admin', 'superadmin'], '/admin/errors', true],
    [['sindico', 'porteiro'], '/reports', true],
    [['sindico', 'porteiro'], '/admin/ai', false],
  ])('roles %j somadas em %s → passa: %s', async (roles, path, allowed) => {
    expect(passed(await proxy(await request(path, { roles })))).toBe(allowed)
  })

  it('token sem roles não entra em nenhuma tela com role', async () => {
    const res = await proxy(await request('/packages', { roles: [] }))
    expect(passed(res)).toBe(false)
    expect(location(res).pathname).toBe('/')
  })

  it('nome com acento e emoji não derruba o proxy', async () => {
    expect(passed(await proxy(await request('/', { role: 'admin' })))).toBe(true)
  })

  it('apaga headers de identidade enviados pelo cliente', async () => {
    const forged = { 'x-user-id': 'forjado', 'x-user-role': 'admin', 'x-condo-id': 'forjado', accept: 'text/html' }

    for (const res of [
      await proxy(await request('/p/abc', { headers: forged })),
      await proxy(await request('/', { role: 'porteiro', headers: forged })),
    ]) {
      // o Next repassa os headers finais do request como x-middleware-request-*
      expect(res.headers.get('x-middleware-request-accept')).toBe('text/html')
      expect(res.headers.get('x-middleware-request-x-user-id')).toBeNull()
      expect(res.headers.get('x-middleware-request-x-user-role')).toBeNull()
      expect(res.headers.get('x-middleware-request-x-condo-id')).toBeNull()
    }
  })
})
