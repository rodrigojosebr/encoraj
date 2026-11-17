import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Simula o banco fora do ar no primeiro acesso de qualquer rota protegida
vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(async () => {
    throw new Error('banco fora do ar')
  }),
}))

import { POST as login } from '@/app/api/auth/route'
import { POST as register } from '@/app/api/register/route'
import { POST as forgot } from '@/app/api/auth/forgot/route'
import { POST as reset } from '@/app/api/auth/reset/route'
import { PROTECTED_ROUTES } from '../helpers/routes'

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

  it.each([
    ['POST /api/auth', login],
    ['POST /api/register', register],
    ['POST /api/auth/forgot', forgot],
    ['POST /api/auth/reset', reset],
  ])('%s com corpo ilegível', async (_name, handler) => {
    const res = await handler(brokenJson())
    expect(res.status).toBe(500)
    expect(Object.keys(await res.json())).toEqual(['error'])
    expect(console.error).toHaveBeenCalled()
  })
})
