import { describe, expect, it } from 'vitest'
import { SignJWT } from 'jose'
import { signToken, verifyToken } from '@/lib/auth/jwt'

const payload = {
  sub: '507f1f77bcf86cd799439011',
  name: 'José',
  roles: ['admin'],
  condo_id: '507f1f77bcf86cd799439012',
  condo_name: 'Condomínio Demo',
}

describe('jwt', () => {
  it('assina e verifica', async () => {
    const decoded = await verifyToken(await signToken(payload))
    expect(decoded).toMatchObject(payload)
    expect(decoded.iat).toBeTypeOf('number')
    expect(decoded.exp! - decoded.iat!).toBe(8 * 60 * 60)
  })

  it('recusa token adulterado', async () => {
    const token = await signToken(payload)
    const [header, body, signature] = token.split('.')
    const forged = Buffer.from(JSON.stringify({ ...payload, roles: ['admin', 'superadmin'], condo_id: 'outro' })).toString('base64url')
    await expect(verifyToken(`${header}.${forged}.${signature}`)).rejects.toThrow()
    expect(body).not.toBe(forged)
  })

  it('recusa token assinado com outro segredo', async () => {
    const other = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('8h')
      .sign(new TextEncoder().encode('outro-segredo'))
    await expect(verifyToken(other)).rejects.toThrow()
  })

  it('recusa token expirado', async () => {
    const expired = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode(process.env.JWT_SECRET))
    await expect(verifyToken(expired)).rejects.toThrow()
  })

  it('re-sign não reaproveita iat/exp do token anterior', async () => {
    const decoded = await verifyToken(await signToken({ ...payload, iat: 1, exp: 2 }))
    expect(decoded.iat).toBeGreaterThan(1)
    expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000))
  })
})
