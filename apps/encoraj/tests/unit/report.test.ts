import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { redact, reportError } from '@/lib/observability/report'
import { errorLogs } from '@/lib/db/collections'

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('redact', () => {
  it('mascara email, telefone, token e credenciais; corta a query de links', () => {
    expect(redact('dup key: { email: "Ana.Souza+1@Exemplo.com.br" }')).toBe('dup key: { email: "[email]" }')
    expect(redact('whatsapp +55 (11) 99999-0000 inválido')).toBe('whatsapp [número] inválido')
    expect(redact('jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijklmnop expirou')).toBe('jwt [token] expirou')
    expect(redact('falha em mongodb+srv://usuario:senha@cluster.mongodb.net/encoraj?retryWrites=true')).toBe(
      'falha em mongodb+srv://[credenciais]@cluster.mongodb.net/encoraj',
    )
    expect(redact('GET https://bucket.s3.amazonaws.com/condos/a/foto.jpg?X-Amz-Signature=abc123')).toBe(
      'GET https://bucket.s3.amazonaws.com/condos/a/foto.jpg',
    )
  })

  it('não mexe em id, código de encomenda nem texto comum', () => {
    const text = 'Encomenda PKG-A1B2C3 do condomínio 507f1f77bcf86cd799439011 não encontrada (tentativa 3)'
    expect(redact(text)).toBe(text)
  })
})

describe('reportError', () => {
  it('escreve o erro completo no log do servidor', async () => {
    const error = new Error('banco fora do ar')
    await reportError('[POST /api/packages]', error)
    expect(console.error).toHaveBeenCalledWith('[POST /api/packages]', error)
  })

  it('nunca manda nada para fora do sistema', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    await reportError('[POST /api/packages]', new Error('falha'), { condoId: '507f1f77bcf86cd799439011' })

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(await (await errorLogs()).countDocuments({})).toBe(1)
  })

  it('mensagem longa é cortada; valor que não é Error também é descrito', async () => {
    await reportError('[a]', new Error('x'.repeat(5000)))
    await reportError('[b]', { code: 42 })
    await reportError('[c]', undefined)

    const byLabel = Object.fromEntries((await (await errorLogs()).find({}).toArray()).map((d) => [d.label, d]))
    expect(byLabel['[a]'].message).toHaveLength(300)
    expect(byLabel['[b]']).toMatchObject({ name: 'Erro', message: '{"code":42}' })
    expect(byLabel['[c]']).toMatchObject({ name: 'Erro', message: 'undefined' })
  })
})
