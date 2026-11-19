import { afterEach, describe, expect, it, vi } from 'vitest'
import { escapeRegex } from '@/lib/db/escape-regex'
import { emailSchema, passwordSchema, PASSWORD_MIN } from '@/lib/auth/email'
import { safeNextPath } from '@/lib/auth/safe-next'
import { formatTermsVersion, legalInfo, TERMS_VERSION } from '@/lib/legal/terms'
import { toSlug } from '@/lib/text/slug'
import { csvCell, csvDocument, csvResponse } from '@/lib/text/csv'
import { clientIp } from '@/lib/auth/rateLimit'
import { fmtDate, fmtDateTime, getTodayRange, parseDateAsTZ } from '@/lib/date/tz'
import { MAX_IMAGE_BYTES, readImageUpload } from '@/lib/upload/image'
import { imageForm, JPEG, PNG, WEBP } from '../helpers/factory'

describe('escapeRegex', () => {
  it('neutraliza metacaracteres', () => {
    expect(new RegExp(escapeRegex('.*')).test('qualquer coisa')).toBe(false)
    expect(new RegExp(escapeRegex('a+b(c)[d]')).test('a+b(c)[d]')).toBe(true)
    expect(escapeRegex('Maria')).toBe('Maria')
  })
})

describe('emailSchema / passwordSchema', () => {
  it('normaliza email para minúsculas e sem espaços', () => {
    expect(emailSchema.parse('  Foo@Exemplo.COM ')).toBe('foo@exemplo.com')
  })

  it('recusa email inválido', () => {
    expect(emailSchema.safeParse('nao-e-email').success).toBe(false)
  })

  it('exige o tamanho mínimo de senha', () => {
    expect(passwordSchema.safeParse('a'.repeat(PASSWORD_MIN - 1)).success).toBe(false)
    expect(passwordSchema.safeParse('a'.repeat(PASSWORD_MIN)).success).toBe(true)
  })
})

describe('documentos legais', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('versão é uma data e é exibida no formato brasileiro', () => {
    expect(TERMS_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(formatTermsVersion('2026-11-17')).toBe('17/11/2026')
    expect(formatTermsVersion()).toBe(formatTermsVersion(TERMS_VERSION))
  })

  it('identificação vem do ambiente, com padrão quando não configurada', () => {
    vi.stubEnv('LEGAL_COMPANY_NAME', '')
    vi.stubEnv('LEGAL_COMPANY_DOC', '')
    vi.stubEnv('LEGAL_CONTACT_EMAIL', '')
    expect(legalInfo()).toEqual({ companyName: 'Encoraj', companyDoc: null, contactEmail: null })

    vi.stubEnv('LEGAL_COMPANY_NAME', ' Encoraj Tecnologia Ltda ')
    vi.stubEnv('LEGAL_COMPANY_DOC', 'CNPJ 00.000.000/0001-00')
    vi.stubEnv('LEGAL_CONTACT_EMAIL', 'privacidade@exemplo.com')
    expect(legalInfo()).toEqual({
      companyName: 'Encoraj Tecnologia Ltda',
      companyDoc: 'CNPJ 00.000.000/0001-00',
      contactEmail: 'privacidade@exemplo.com',
    })
  })
})

describe('safeNextPath', () => {
  it('aceita caminho interno', () => {
    expect(safeNextPath('/packages/abc')).toBe('/packages/abc')
  })

  it.each(['//evil.com', '/\\evil.com', 'https://evil.com', 'evil.com', '', null, undefined])(
    'recusa %s',
    (next) => {
      expect(safeNextPath(next)).toBe('/')
    },
  )
})

describe('toSlug', () => {
  it('remove acento, espaço e pontuação', () => {
    expect(toSlug('Condomínio São José!')).toBe('condominio-sao-jose')
    expect(toSlug('  --Bloco  A--  ')).toBe('bloco-a')
    expect(toSlug('日本')).toBe('')
  })
})

describe('csvDocument / csvResponse', () => {
  it('monta o arquivo com BOM, separador ; e células protegidas', () => {
    expect(csvDocument(['Nome', 'Qtd'], [['Ana "A"', 3], ['=1+1', 0]])).toBe(
      `﻿"Nome";"Qtd"\n"Ana ""A""";"3"\n"'=1+1";"0"`,
    )
  })

  it('resposta de download não é guardada em cache', async () => {
    const res = csvResponse('arquivo.csv', 'conteúdo')
    expect(res.headers.get('content-disposition')).toBe('attachment; filename="arquivo.csv"')
    expect(res.headers.get('cache-control')).toBe('private, no-store')
    expect(await res.text()).toBe('conteúdo')
  })
})

describe('csvCell', () => {
  it('escapa aspas', () => {
    expect(csvCell('diz "oi"')).toBe('"diz ""oi"""')
  })

  it.each(['=1+1', '+55', '-2', '@SUM(A1)'])('neutraliza fórmula %s', (value) => {
    expect(csvCell(value)).toBe(`"'${value}"`)
  })
})

describe('clientIp', () => {
  it('usa o primeiro IP do x-forwarded-for', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }))).toBe('1.2.3.4')
  })

  it('cai em "unknown" sem header', () => {
    expect(clientIp(new Headers())).toBe('unknown')
  })
})

describe('datas no fuso de São Paulo', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('parseDateAsTZ devolve a meia-noite BRT em UTC', () => {
    expect(parseDateAsTZ('2026-03-17').toISOString()).toBe('2026-03-17T03:00:00.000Z')
  })

  it('getTodayRange não vira o dia às 21h BRT', () => {
    // 00:30 UTC do dia 18 ainda é 21:30 do dia 17 em São Paulo
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-18T00:30:00.000Z'))
    const { today, tomorrow } = getTodayRange()
    expect(today.toISOString()).toBe('2026-03-17T03:00:00.000Z')
    expect(tomorrow.toISOString()).toBe('2026-03-18T03:00:00.000Z')
  })

  it('formata no fuso do app', () => {
    const date = new Date('2026-03-18T00:30:00.000Z')
    expect(fmtDate(date)).toBe('17/03/2026')
    expect(fmtDateTime(date)).toContain('17/03/2026')
    expect(fmtDateTime(date)).toContain('21:30')
    expect(fmtDate(null)).toBe('—')
    expect(fmtDateTime(undefined)).toBe('—')
  })
})

describe('readImageUpload', () => {
  it.each([
    ['jpeg', JPEG, 'image/jpeg', 'jpg'],
    ['png', PNG, 'image/png', 'png'],
    ['webp', WEBP, 'image/webp', 'webp'],
  ] as const)('reconhece %s pelos bytes', async (_name, bytes, contentType, ext) => {
    // tipo declarado propositalmente errado: o que vale é o conteúdo
    const result = await readImageUpload(imageForm(bytes, 'application/octet-stream'))
    expect(result).toMatchObject({ contentType, ext })
  })

  it('recusa arquivo que só diz ser imagem', async () => {
    const fake = new TextEncoder().encode('<script>alert(1)</script>')
    const result = await readImageUpload(imageForm(new Uint8Array(fake), 'image/jpeg'))
    expect(result).toEqual({ error: expect.stringContaining('Formato inválido') })
  })

  it('recusa arquivo acima do limite', async () => {
    const big = new Uint8Array(MAX_IMAGE_BYTES + 1)
    big.set(JPEG)
    const result = await readImageUpload(imageForm(big))
    expect(result).toEqual({ error: expect.stringContaining('muito grande') })
  })

  it('recusa formulário sem arquivo', async () => {
    const form = new FormData()
    form.set('file', 'texto')
    expect(await readImageUpload(form)).toEqual({ error: 'Arquivo não enviado.' })
    expect(await readImageUpload(new FormData())).toEqual({ error: 'Arquivo não enviado.' })
  })
})
