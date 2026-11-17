import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Db } from 'mongodb'

const { sendMail, createTransport } = vi.hoisted(() => {
  const sendMail = vi.fn(async (_message: unknown) => ({}))
  return { sendMail, createTransport: vi.fn((_options: unknown) => ({ sendMail })) }
})
vi.mock('nodemailer', () => ({ default: { createTransport } }))

import { ensureIndexes } from '@/lib/db/indexes'
import { generateAndUploadQRCode } from '@/lib/qrcode/generate'
import { readImageUpload } from '@/lib/upload/image'
import { imageForm } from '../helpers/factory'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
  vi.restoreAllMocks()
})

describe('variáveis de ambiente obrigatórias', () => {
  it('jwt.ts recusa subir sem JWT_SECRET', async () => {
    vi.stubEnv('JWT_SECRET', '')
    vi.resetModules()
    await expect(import('@/lib/auth/jwt')).rejects.toThrow('JWT_SECRET')
  })

  it('client.ts recusa subir sem MONGODB_URI', async () => {
    vi.stubEnv('MONGODB_URI', '')
    vi.resetModules()
    await expect(import('@/lib/db/client')).rejects.toThrow('MONGODB_URI')
  })

  it('em produção o client não fica pendurado no globalThis', async () => {
    const before = globalThis._mongoClient
    globalThis._mongoClient = undefined
    vi.stubEnv('NODE_ENV', 'production')
    vi.resetModules()
    await import('@/lib/db/client')
    expect(globalThis._mongoClient).toBeUndefined()
    globalThis._mongoClient = before
  })
})

describe('mailer', () => {
  it('monta o transporte pelas variáveis SMTP e envia com o remetente configurado', async () => {
    vi.stubEnv('SMTP_HOST', 'smtp.teste.com')
    vi.stubEnv('SMTP_PORT', '465')
    vi.stubEnv('SMTP_USER', 'usuario')
    vi.stubEnv('SMTP_PASS', 'senha')
    vi.stubEnv('SMTP_FROM', 'Encoraj <nao-responda@teste.com>')
    vi.resetModules()
    const { sendEmail } = await import('@/lib/email/mailer')

    expect(createTransport).toHaveBeenLastCalledWith({
      host: 'smtp.teste.com',
      port: 465,
      secure: true,
      auth: { user: 'usuario', pass: 'senha' },
    })

    await sendEmail({ to: 'ana@teste.com', subject: 'Assunto', html: '<p>oi</p>' })
    expect(sendMail).toHaveBeenLastCalledWith({
      from: 'Encoraj <nao-responda@teste.com>',
      to: 'ana@teste.com',
      subject: 'Assunto',
      html: '<p>oi</p>',
    })
  })
})

describe('cliente S3 real', () => {
  it('lê região e bucket do ambiente', async () => {
    vi.stubEnv('AWS_REGION', 'sa-east-1')
    vi.stubEnv('AWS_ACCESS_KEY_ID', 'chave-de-teste')
    vi.stubEnv('AWS_SECRET_ACCESS_KEY', 'segredo-de-teste')
    vi.stubEnv('AWS_S3_BUCKET', 'bucket-de-teste')
    const real = await vi.importActual<typeof import('@/lib/s3/client')>('@/lib/s3/client')

    expect(real.S3_BUCKET).toBe('bucket-de-teste')
    expect(real.S3_REGION).toBe('sa-east-1')
    expect(await real.s3.config.region()).toBe('sa-east-1')
  })
})

describe('QR code', () => {
  it('aponta para APP_URL/packages/{id}, com localhost como padrão', async () => {
    const url = await generateAndUploadQRCode('pkg1', 'condo1')
    expect(url).toBe('https://test-bucket.s3.us-east-1.amazonaws.com/condos/condo1/packages/qrcodes/pkg1.png')

    vi.stubEnv('APP_URL', '')
    delete process.env.APP_URL
    expect(await generateAndUploadQRCode('pkg2', 'condo1')).toContain('/qrcodes/pkg2.png')
  })
})

describe('readImageUpload', () => {
  it('recusa arquivo pequeno demais para ter cabeçalho de imagem', async () => {
    const result = await readImageUpload(imageForm(new Uint8Array([0xff, 0xd8, 0xff])))
    expect(result).toEqual({ error: expect.stringContaining('Formato inválido') })
  })
})

describe('ensureIndexes', () => {
  const fresh = () => {
    globalThis.__indexesEnsured = undefined
  }

  it('índice recusado só é registrado — não derruba o request', async () => {
    const saved = globalThis.__indexesEnsured
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const db = {
      collection: () => ({
        createIndex: async () => {
          throw new Error('duplicate key')
        },
        findOne: async () => null, // sem status "active": pula o índice único de email
      }),
    } as unknown as Db

    fresh()
    await expect(ensureIndexes(db)).resolves.toBeUndefined()
    expect(log).toHaveBeenCalledWith('[indexes]', expect.any(Error))
    globalThis.__indexesEnsured = saved
  })

  it('falha inesperada também só é registrada', async () => {
    const saved = globalThis.__indexesEnsured
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const db = {
      collection: () => {
        throw new Error('conexão caiu')
      },
    } as unknown as Db

    fresh()
    await expect(ensureIndexes(db)).resolves.toBeUndefined()
    expect(log).toHaveBeenCalledWith('[indexes]', expect.any(Error))
    globalThis.__indexesEnsured = saved
  })
})
