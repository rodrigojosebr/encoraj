import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { generateContent, getGenerativeModel } = vi.hoisted(() => {
  const generateContent = vi.fn()
  return { generateContent, getGenerativeModel: vi.fn((_options: { model: string }) => ({ generateContent })) }
})

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel = getGenerativeModel
  },
}))

import { analyzePackageLabel } from '@/lib/gemini/ocr'

const residents = [
  { id: 'r1', name: 'Maria Silva', apartment: '101', bloco: 'A' },
  { id: 'r2', name: 'João Souza', apartment: '202' },
]

function reply(text: string) {
  generateContent.mockResolvedValueOnce({ response: { text: () => text } })
}

describe('analyzePackageLabel', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'chave-de-teste'
    generateContent.mockReset()
    getGenerativeModel.mockClear()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    delete process.env.GEMINI_API_KEY
    delete process.env.GEMINI_MODEL
    vi.restoreAllMocks()
  })

  it('devolve o morador identificado', async () => {
    reply('{"resident_id":"r1","confidence":"high","extracted_text":"Maria Silva ap 101"}')
    expect(await analyzePackageLabel('base64', 'image/jpeg', residents)).toEqual({
      resident_id: 'r1',
      confidence: 'high',
      extracted_text: 'Maria Silva ap 101',
    })
  })

  it('manda só os moradores recebidos no prompt', async () => {
    reply('{"resident_id":"r2","confidence":"medium","extracted_text":"Joao"}')
    await analyzePackageLabel('base64', 'image/jpeg', residents)
    const prompt = generateContent.mock.calls[0][0][0].text as string
    expect(prompt).toContain('id: r1 | name: Maria Silva | apartment: 101 | bloco: A')
    expect(prompt).toContain('id: r2 | name: João Souza | apartment: 202')
  })

  it('usa o modelo de GEMINI_MODEL, com um padrão quando a variável não existe', async () => {
    const json = '{"resident_id":"r1","confidence":"high","extracted_text":"x"}'
    reply(json)
    await analyzePackageLabel('b', 'image/png', residents)
    expect(getGenerativeModel).toHaveBeenLastCalledWith({ model: 'gemini-2.0-flash' })

    process.env.GEMINI_MODEL = 'modelo-novo'
    reply(json)
    await analyzePackageLabel('b', 'image/png', residents)
    expect(getGenerativeModel).toHaveBeenLastCalledWith({ model: 'modelo-novo' })
  })

  it('aceita JSON dentro de cerca de markdown', async () => {
    reply('```json\n{"resident_id":"r2","confidence":"medium","extracted_text":"Joao"}\n```')
    expect(await analyzePackageLabel('b', 'image/png', residents)).toMatchObject({ resident_id: 'r2' })
  })

  it('rebaixa confiança desconhecida para low', async () => {
    reply('{"resident_id":"r1","confidence":"altissima","extracted_text":"x"}')
    expect(await analyzePackageLabel('b', 'image/png', residents)).toMatchObject({ confidence: 'low' })
  })

  it('texto extraído ausente vira string vazia', async () => {
    reply('{"resident_id":"r1","confidence":"high"}')
    expect(await analyzePackageLabel('b', 'image/png', residents)).toMatchObject({ extracted_text: '' })
  })

  it('descarta id que não está na lista (alucinação ou outro condomínio)', async () => {
    reply('{"resident_id":"r999","confidence":"high","extracted_text":"x"}')
    expect(await analyzePackageLabel('b', 'image/png', residents)).toBeNull()
  })

  it.each([
    ['resposta sem morador', '{"resident_id":null,"confidence":"low","extracted_text":""}'],
    ['resposta que não é JSON', 'não consegui ler a etiqueta'],
  ])('devolve null com %s', async (_name, text) => {
    reply(text)
    expect(await analyzePackageLabel('b', 'image/png', residents)).toBeNull()
  })

  it('devolve null se o Gemini falhar', async () => {
    generateContent.mockRejectedValueOnce(new Error('quota'))
    expect(await analyzePackageLabel('b', 'image/png', residents)).toBeNull()
  })

  it('devolve null sem chave ou sem moradores, sem chamar o Gemini', async () => {
    expect(await analyzePackageLabel('b', 'image/png', [])).toBeNull()
    delete process.env.GEMINI_API_KEY
    expect(await analyzePackageLabel('b', 'image/png', residents)).toBeNull()
    expect(generateContent).not.toHaveBeenCalled()
  })
})
