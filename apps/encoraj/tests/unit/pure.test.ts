import { afterEach, describe, expect, it, vi } from 'vitest'
import { escapeRegex } from '@/lib/db/escape-regex'
import { emailSchema } from '@/lib/auth/email'
import { passwordSchema } from '@/lib/auth/password'
import { PASSWORD_MIN } from '@/lib/auth/password-rules'
import { safeNextPath } from '@/lib/auth/safe-next'
import { formatTermsVersion, legalInfo, TERMS_VERSION } from '@/lib/legal/terms'
import { toSlug } from '@/lib/text/slug'
import { csvCell, csvDocument, csvResponse, parseCsv } from '@/lib/text/csv'
import { clientIp } from '@/lib/auth/rate-limit'
import { fmtDate, fmtDateTime, getTodayRange, parseDateAsTZ } from '@/lib/date/tz'
import { MAX_IMAGE_BYTES, readImageUpload } from '@/lib/upload/image'
import { searchResidents } from '@/lib/residents/search'
import { MAX_SHEET_ROWS, readResidentSheet, residentSheetTemplate } from '@/lib/residents/sheet'
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

describe('searchResidents', () => {
  // Na ordem em que a página manda: por nome
  const people = [
    { id: 'ana', name: 'Ana Souza', apartment: '101', block: '2' },
    { id: 'bia', name: 'Beatriz Araújo', apartment: '1', block: '2' },
    { id: 'caio', name: 'Caio Lima', apartment: '201', block: '1' },
    { id: 'dora', name: 'Dora Aparecida', apartment: '10' },
    { id: 'edu', name: 'Eduardo Blanco', apartment: '12-B', block: 'A' },
  ]
  const ids = (query: string) => searchResidents(people, query)?.map((p) => p.id) ?? null

  it('sem nada para buscar devolve null — inclusive "apto" ou "bloco" ainda sem valor', () => {
    expect(ids('')).toBeNull()
    expect(ids('   ')).toBeNull()
    expect(ids('—')).toBeNull()
    expect(ids('apto')).toBeNull()
    expect(ids('Bloco ')).toBeNull()
  })

  it('acha pelo começo de cada palavra do nome, sem ligar para acento ou maiúscula', () => {
    expect(ids('ARAUJO')).toEqual(['bia'])
    expect(ids('ana so')).toEqual(['ana'])
    expect(ids('apa')).toEqual(['dora']) // "apa" não é "ap": continua sendo nome
    expect(searchResidents(people, 'caio')?.[0]).toBe(people[2])
  })

  it('acha pela unidade, e quem bate por inteiro vem primeiro', () => {
    expect(ids('10')).toEqual(['dora', 'ana']) // apto 10 antes do 101
    expect(ids('apt 1')).toEqual(['bia', 'ana', 'dora', 'edu'])
    expect(ids('apartamento 201')).toEqual(['caio'])
  })

  it('depois de "apto" e "bloco" o valor só vale para aquele campo', () => {
    expect(ids('bloco 2 apto 1')).toEqual(['bia', 'ana'])
    // sem as palavras, "2" e "1" batem em qualquer campo: entra o apto 201 do bloco 1
    expect(ids('2 1')).toEqual(['bia', 'ana', 'caio'])
    expect(ids('bloco 1')).toEqual(['caio']) // quem não tem bloco fica de fora
  })

  it('aceita abreviação e apartamento com letra', () => {
    expect(ids('ap 12 bl a')).toEqual(['edu'])
    expect(ids('12 b')).toEqual(['edu'])
    expect(ids('apto 12b')).toEqual(['edu'])
    expect(ids('apto 12-B')).toEqual(['edu'])
  })

  it('"apto" sobrando no fim não atrapalha o que já foi digitado', () => {
    expect(ids('ana apto')).toEqual(['ana'])
  })

  it('ninguém bate: lista vazia, não null', () => {
    expect(ids('tigrão')).toEqual([])
    expect(ids('bloco 9')).toEqual([])
  })
})

describe('parseCsv', () => {
  it('escolhe o separador pela primeira linha escrita: ; , ou tabulação', () => {
    const expected = [['a', 'b'], ['1', '2']]
    expect(parseCsv('a;b\n1;2\n')).toEqual(expected)
    expect(parseCsv('a,b\n1,2')).toEqual(expected)
    expect(parseCsv('a\tb\n1\t2')).toEqual(expected)
    expect(parseCsv('\n \na,b\n1,2')).toEqual([[''], [' '], ...expected]) // linhas em branco antes não confundem
    expect(parseCsv('a;b,c;d')).toEqual([['a', 'b,c', 'd']]) // vence o que mais aparece
    expect(parseCsv('abc\n1;2')).toEqual([['abc'], ['1', '2']]) // sem separador na primeira linha: fica o ;
  })

  it('célula entre aspas guarda separador, aspas dobradas e quebra de linha', () => {
    expect(parseCsv('"Silva; Ana";"diz ""oi""";"linha 1\nlinha 2"\n')).toEqual([['Silva; Ana', 'diz "oi"', 'linha 1\nlinha 2']])
    expect(parseCsv('"";x')).toEqual([['', 'x']])
    expect(parseCsv('a"b;c')).toEqual([['a"b', 'c']]) // aspas no meio do texto são só aspas
  })

  it('aceita fim de linha de Windows, Mac e Linux, tira o BOM e mantém a linha em branco no lugar', () => {
    expect(parseCsv('﻿a;b\r\n1;2\r3;4\n\n5;6')).toEqual([['a', 'b'], ['1', '2'], ['3', '4'], [''], ['5', '6']])
  })

  it('arquivo vazio não tem linha; célula vazia no fim da última linha conta', () => {
    expect(parseCsv('')).toEqual([])
    expect(parseCsv('a;')).toEqual([['a', '']])
    expect(parseCsv('a;""')).toEqual([['a', '']])
  })
})

describe('readResidentSheet', () => {
  const bytes = (text: string) => new TextEncoder().encode(text)
  const read = (...lines: string[]) => readResidentSheet(bytes(lines.join('\n')))
  const HEADER = 'Nome;Bloco (opcional);Apartamento;WhatsApp (DDD + número)'

  it('o modelo tem só os títulos, e enviado de volta sem preencher é recusado', () => {
    expect(residentSheetTemplate()).toBe('﻿"Nome";"Bloco (opcional)";"Apartamento";"WhatsApp (DDD + número)"')
    expect(readResidentSheet(bytes(residentSheetTemplate()))).toEqual({
      error: 'A planilha não tem nenhum morador. Preencha uma linha por morador, abaixo dos títulos.',
    })
  })

  it('lê as linhas, arruma espaços e deixa o WhatsApp no formato gravado', () => {
    const result = read(
      HEADER,
      '  Ana   Souza ;A;101;(11) 99999-0001',
      'Bruno Lima;;202;5511999990002',
      'Caio;B;01;011 99999 0003',
      "Duda;;3;'+55 11 99999-0004",
    )
    expect(result).toEqual({
      rows: [
        { line: 2, name: 'Ana Souza', block: 'A', apartment: '101', whatsapp: '+5511999990001' },
        { line: 3, name: 'Bruno Lima', apartment: '202', whatsapp: '+5511999990002' },
        { line: 4, name: 'Caio', block: 'B', apartment: '01', whatsapp: '+5511999990003' },
        { line: 5, name: 'Duda', apartment: '3', whatsapp: '+5511999990004' },
      ],
      problems: [],
    })
    // bloco em branco não vira campo vazio no cadastro
    expect('rows' in result && result.rows[1]).not.toHaveProperty('block')
  })

  it('acha as colunas pelo título: outra ordem, outros nomes, vírgula, coluna a mais e sem bloco', () => {
    expect(read('Telefone,Unidade,Morador,Obs', '11999990001,12,Ana,qualquer coisa')).toEqual({
      rows: [{ line: 2, name: 'Ana', apartment: '12', whatsapp: '+5511999990001' }],
      problems: [],
    })
    // título repetido: vale a primeira coluna
    expect(read('Nome;Nome do pai;Apto;Celular', 'Ana;José;1;11999990001')).toMatchObject({ rows: [{ name: 'Ana' }] })
  })

  it('o número da linha é o do Excel: linha em branco é pulada sem mudar a conta', () => {
    expect(read('', 'Nome;Apartamento;WhatsApp', 'Ana;1;11999990001', ';;', 'Bia;2')).toEqual({
      rows: [{ line: 3, name: 'Ana', apartment: '1', whatsapp: '+5511999990001' }],
      problems: [{ line: 5, message: 'Falta o WhatsApp.' }], // linha mais curta que os títulos
    })
  })

  it('aponta cada problema com a linha, e linha com problema não entra', () => {
    const long = 'x'.repeat(21)
    expect(
      read(
        HEADER,
        'A;;101;11999990001',
        ';;;11999990001',
        `${'N'.repeat(121)};${long};${long};11999990001`,
        'Bia;;1;5,51199E+12',
        'Caio;;2;99999-0001',
        'Duda;;3;4411999990001',
        'Edu;;4;1,19999999E+10',
        'Fabi;;5;11999990005',
      ),
    ).toEqual({
      rows: [{ line: 9, name: 'Fabi', apartment: '5', whatsapp: '+5511999990005' }],
      problems: [
        { line: 2, message: 'Nome: use de 2 a 120 caracteres.' },
        { line: 3, message: 'Falta o nome.' },
        { line: 3, message: 'Falta o apartamento.' },
        { line: 4, message: 'Nome: use de 2 a 120 caracteres.' },
        { line: 4, message: 'Apartamento: use até 20 caracteres.' },
        { line: 4, message: 'Bloco: use até 20 caracteres.' },
        { line: 5, message: 'WhatsApp "5,51199E+12": o Excel trocou o número por notação científica. Formate a coluna como Texto e digite de novo.' },
        { line: 6, message: 'WhatsApp "99999-0001": use DDD + número, 11 dígitos (ex.: 11999990000).' },
        { line: 7, message: 'WhatsApp "4411999990001": use DDD + número, 11 dígitos (ex.: 11999990000).' },
        // notação científica que por acaso soma 11 dígitos não passa como telefone
        { line: 8, message: 'WhatsApp "1,19999999E+10": o Excel trocou o número por notação científica. Formate a coluna como Texto e digite de novo.' },
      ],
    })
  })

  it('arquivo salvo pelo Excel do Windows (Windows-1252) mantém os acentos', () => {
    const latin1 = Uint8Array.from(Buffer.from('Nome;Apartamento;WhatsApp\nJosé Conceição;1;11999990001', 'latin1'))
    expect(readResidentSheet(latin1)).toMatchObject({ rows: [{ name: 'José Conceição' }], problems: [] })
  })

  it('recusa o arquivo inteiro quando não é uma planilha de moradores', () => {
    expect(read('')).toEqual({ error: 'A planilha está vazia.' })
    expect(read(' ', ';;')).toEqual({ error: 'A planilha está vazia.' })
    expect(read('Nome;Apto', 'Ana;1')).toEqual({
      error: 'Não encontrei a coluna WhatsApp. Baixe o modelo e preencha nele, sem mudar os títulos.',
    })
    expect(read('Nome;Endereço', 'Ana;Rua X')).toEqual({
      error: 'Não encontrei as colunas Apartamento e WhatsApp. Baixe o modelo e preencha nele, sem mudar os títulos.',
    })
    // .xlsx é um zip: começa com "PK" e tem byte nulo logo no início
    expect(readResidentSheet(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]))).toEqual({
      error: 'Este arquivo não é CSV. No Excel: Arquivo → Salvar como → "CSV UTF-8 (delimitado por vírgulas)".',
    })
  })

  it('aceita até o limite de linhas, e recusa acima dele', () => {
    const lines = Array.from({ length: MAX_SHEET_ROWS + 1 }, (_, i) => `Morador ${i};;${i};11999990001`)
    expect(read(HEADER, ...lines.slice(0, MAX_SHEET_ROWS))).toMatchObject({ problems: [] })
    expect(read(HEADER, ...lines)).toEqual({ error: 'A planilha tem mais de 2.000 moradores. Divida em arquivos menores.' })
  })
})
