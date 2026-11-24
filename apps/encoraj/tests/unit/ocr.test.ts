import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }))

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent }
  },
}))

import { analyzePackageLabel } from '@/lib/gemini/ocr'

const residents = [
  { id: 'r1', name: 'Maria Silva', apartment: '101', block: 'A' },
  { id: 'r2', name: 'João Souza', apartment: '202' },
]

function reply(text: string | undefined) {
  generateContent.mockResolvedValueOnce({ text })
}

/** O que foi enviado na última chamada ao modelo */
const lastRequest = () => generateContent.mock.calls.at(-1)![0]

describe('analyzePackageLabel', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'chave-de-teste'
    generateContent.mockReset()
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
    const [prompt, image] = lastRequest().contents[0].parts
    expect(prompt.text).toContain('id: r1 | name: Maria Silva | apartment: 101 | block: A')
    expect(prompt.text).toContain('id: r2 | name: João Souza | apartment: 202')
    expect(image).toEqual({ inlineData: { mimeType: 'image/jpeg', data: 'base64' } })
    expect(lastRequest().config).toMatchObject({ responseMimeType: 'application/json', httpOptions: { timeout: 15_000 } })
  })

  it('usa o modelo de GEMINI_MODEL, com um padrão quando a variável não existe', async () => {
    const json = '{"resident_id":"r1","confidence":"high","extracted_text":"x"}'
    reply(json)
    await analyzePackageLabel('b', 'image/png', residents)
    expect(lastRequest().model).toBe('gemini-3.6-flash')

    process.env.GEMINI_MODEL = 'modelo-novo'
    reply(json)
    await analyzePackageLabel('b', 'image/png', residents)
    expect(lastRequest().model).toBe('modelo-novo')
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
    ['resposta sem texto', undefined],
  ])('devolve null com %s', async (_name, text) => {
    reply(text)
    expect(await analyzePackageLabel('b', 'image/png', residents)).toBeNull()
  })

  it('devolve null se o Gemini falhar', async () => {
    generateContent.mockRejectedValueOnce(new Error('quota'))
    expect(await analyzePackageLabel('b', 'image/png', residents)).toBeNull()
  })

  describe('monitoramento de uso', () => {
    const usageOf = async (prepare: () => void) => {
      const onUsage = vi.fn()
      prepare()
      await analyzePackageLabel('b', 'image/png', residents, onUsage)
      expect(onUsage).toHaveBeenCalledTimes(1)
      return onUsage.mock.calls[0][0]
    }

    it('informa modelo, resultado, tokens e tempo quando identifica', async () => {
      const usage = await usageOf(() =>
        generateContent.mockResolvedValueOnce({
          text: '{"resident_id":"r1","confidence":"medium","extracted_text":"Maria"}',
          usageMetadata: { promptTokenCount: 1200, candidatesTokenCount: 40, totalTokenCount: 1240 },
        }),
      )
      expect(usage).toMatchObject({
        model: 'gemini-3.6-flash',
        outcome: 'matched',
        confidence: 'medium',
        promptTokens: 1200,
        outputTokens: 40,
        totalTokens: 1240,
      })
      expect(usage.latencyMs).toBeGreaterThanOrEqual(0)
      expect(JSON.stringify(usage)).not.toContain('Maria') // nunca o texto lido
    })

    it('soma os tokens quando o provedor não manda o total', async () => {
      const usage = await usageOf(() =>
        generateContent.mockResolvedValueOnce({
          text: '{"resident_id":null}',
          usageMetadata: { promptTokenCount: 900, candidatesTokenCount: 10 },
        }),
      )
      expect(usage).toMatchObject({ outcome: 'no_match', totalTokens: 910 })
    })

    it.each([
      ['resposta que não é JSON', () => reply('ilegível'), 'invalid_response'],
      ['id fora da lista', () => reply('{"resident_id":"r999","confidence":"high","extracted_text":"x"}'), 'invalid_response'],
      ['falha do Gemini', () => generateContent.mockRejectedValueOnce(new Error('quota')), 'error'],
      ['sem chave', () => delete process.env.GEMINI_API_KEY, 'disabled'],
    ])('%s → %s', async (_name, prepare, outcome) => {
      expect(await usageOf(prepare)).toMatchObject({ outcome, promptTokens: 0, totalTokens: 0 })
    })

    it('sem moradores não há chamada nem registro', async () => {
      const onUsage = vi.fn()
      await analyzePackageLabel('b', 'image/png', [], onUsage)
      expect(onUsage).not.toHaveBeenCalled()
    })
  })

  it('devolve null sem chave ou sem moradores, sem chamar o Gemini', async () => {
    expect(await analyzePackageLabel('b', 'image/png', [])).toBeNull()
    delete process.env.GEMINI_API_KEY
    expect(await analyzePackageLabel('b', 'image/png', residents)).toBeNull()
    expect(generateContent).not.toHaveBeenCalled()
  })
})
