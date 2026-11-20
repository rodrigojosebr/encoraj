import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Simula o banco fora do ar no primeiro acesso de qualquer rota protegida
vi.mock('@/lib/auth/session', () => {
  const down = vi.fn(async () => {
    throw new Error('banco fora do ar')
  })
  return { getSession: down, getSessionForPasswordChange: down }
})

// Rotas públicas não passam pela sessão: o primeiro acesso ao banco delas é o limite de
// tentativas. Desligado por padrão; cada teste liga quando quer simular o banco fora do ar.
const rateLimitState = vi.hoisted(() => ({ down: false }))
vi.mock('@/lib/auth/rate-limit', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/auth/rate-limit')>()
  const guard = () => {
    if (rateLimitState.down) throw new Error('banco fora do ar')
  }
  return {
    ...real,
    isRateLimited: vi.fn(async (...args: Parameters<typeof real.isRateLimited>) => (guard(), real.isRateLimited(...args))),
    checkRateLimit: vi.fn(async (...args: Parameters<typeof real.checkRateLimit>) => (guard(), real.checkRateLimit(...args))),
  }
})

import { POST as login } from '@/app/api/auth/route'
import { POST as forgot } from '@/app/api/auth/forgot/route'
import { POST as reset } from '@/app/api/auth/reset/route'
import { PROTECTED_ROUTES } from '../helpers/routes'
import { jsonRequest } from '../helpers/factory'

const brokenJson = () =>
  new NextRequest('http://localhost/api/test', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.0.0.1' },
    body: '{isto não é json',
  })

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('falha interna nunca vaza detalhe e sempre é registrada', () => {
  it.each(PROTECTED_ROUTES)('$name', async ({ name, call }) => {
    const res = await call()
    const body = await res.json()

    if (name === 'POST /api/ocr') {
      // OCR nunca bloqueia o porteiro: degrada para seleção manual
      expect(body).toMatchObject({ match: null, error: 'ocr_unavailable' })
    } else {
      expect(res.status).toBe(500)
      expect(Object.keys(body)).toEqual(['error'])
    }
    expect(JSON.stringify(body)).not.toContain('banco fora do ar')
    expect(console.error).toHaveBeenCalled()
  })
})

describe('corpo ilegível é erro de quem chamou, não do servidor', () => {
  it.each([
    ['POST /api/auth', login],
    ['POST /api/auth/forgot', forgot],
    ['POST /api/auth/reset', reset],
  ])('%s → 400, sem registrar erro', async (_name, handler) => {
    const res = await handler(brokenJson())
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Dados inválidos.' })
    expect(console.error).not.toHaveBeenCalled()
  })
})

describe('rotas públicas: falha interna vira 500 sem detalhe e fica registrada', () => {
  beforeEach(() => {
    rateLimitState.down = true
  })
  afterEach(() => {
    rateLimitState.down = false
  })

  it.each([
    ['POST /api/auth', login, { email: 'ana@teste.com', password: 'qualquer-senha' }],
    ['POST /api/auth/forgot', forgot, { email: 'ana@teste.com' }],
    ['POST /api/auth/reset', reset, { token: 'um-token', password: 'senha-forte-123' }],
  ])('%s', async (_name, handler, body) => {
    const res = await handler(jsonRequest('POST', body))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Erro interno.' })
    expect(console.error).toHaveBeenCalled()
  })
})
