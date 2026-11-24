import { GoogleGenAI } from '@google/genai'
import { reportError } from '@/lib/observability/report'

export interface ResidentContext {
  id: string
  name: string
  apartment: string
  block?: string
}

export interface OcrResult {
  resident_id: string
  confidence: 'high' | 'medium' | 'low'
  extracted_text: string
}

/**
 * Modelo padrão: o substituto que o Google indica para o gemini-2.0-flash (desligado em
 * 1º/jun/2026). Trocável por GEMINI_MODEL sem deploy de código.
 */
const DEFAULT_MODEL = 'gemini-3.6-flash'

/** Tempo máximo da chamada no servidor (a tela também desiste em 15 s e segue na lista). */
const TIMEOUT_MS = 15_000

/** O que aconteceu numa chamada — vai para o monitoramento de uso de IA, sem texto nem imagem */
export interface OcrUsage {
  model: string
  outcome: 'matched' | 'no_match' | 'invalid_response' | 'error' | 'disabled'
  confidence?: OcrResult['confidence']
  promptTokens: number
  outputTokens: number
  totalTokens: number
  latencyMs: number
}

const PROMPT_TEMPLATE = (residents: ResidentContext[]) => `
You are analyzing a package delivery label photo.
Your task is to identify which resident in the list below is the intended recipient.

RESIDENTS LIST:
${residents.map((r) => `- id: ${r.id} | name: ${r.name} | apartment: ${r.apartment}${r.block ? ` | block: ${r.block}` : ''}`).join('\n')}

Look for the following on the label:
- Recipient name
- Apartment number
- Block letter (bloco)

Return ONLY a valid JSON object, no markdown, no explanation:
{
  "resident_id": "<id from the list above, or null if not found>",
  "confidence": "<high | medium | low>",
  "extracted_text": "<raw recipient text you found on the label>"
}

Confidence rules:
- "high": name + apartment match a single resident clearly
- "medium": name matches (apartment absent or partial) OR apartment matches but name is ambiguous
- "low": only fragments found, match is uncertain

If you cannot identify any resident, return:
{"resident_id": null, "confidence": "low", "extracted_text": ""}
`.trim()

export async function analyzePackageLabel(
  imageBase64: string,
  mimeType: string,
  residents: ResidentContext[],
  /** Chamado uma vez por tentativa de usar o modelo (não é chamado se não há moradores) */
  onUsage?: (usage: OcrUsage) => void,
): Promise<OcrResult | null> {
  // Modelo trocável por env: quando o Google aposentar um modelo, basta mudar a variável
  const modelName = process.env.GEMINI_MODEL || DEFAULT_MODEL
  const startedAt = Date.now()
  const tokens = { promptTokens: 0, outputTokens: 0, totalTokens: 0 }
  const report = (outcome: OcrUsage['outcome'], confidence?: OcrResult['confidence']) =>
    onUsage?.({ model: modelName, outcome, confidence, ...tokens, latencyMs: Date.now() - startedAt })

  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      // OCR desligado por configuração: o porteiro só vê a seleção manual — precisa de alerta
      await reportError('[ocr]', new Error('GEMINI_API_KEY não definida'))
      report('disabled')
      return null
    }

    if (residents.length === 0) return null

    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: 'user',
          parts: [{ text: PROMPT_TEMPLATE(residents) }, { inlineData: { mimeType, data: imageBase64 } }],
        },
      ],
      config: { responseMimeType: 'application/json', httpOptions: { timeout: TIMEOUT_MS } },
    })

    const usage = response.usageMetadata
    tokens.promptTokens = usage?.promptTokenCount ?? 0
    tokens.outputTokens = usage?.candidatesTokenCount ?? 0
    tokens.totalTokens = usage?.totalTokenCount ?? tokens.promptTokens + tokens.outputTokens

    // `text` é propriedade no SDK novo e vem vazia quando o modelo não devolve texto
    const text = (response.text ?? '').trim()

    // Cerca de markdown em volta do JSON, se o modelo mandar mesmo assim
    const jsonText = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

    let parsed: { resident_id: string | null; confidence: string; extracted_text: string }
    try {
      parsed = JSON.parse(jsonText)
    } catch {
      // Sem o texto da resposta: ele traz o que foi lido da etiqueta (nome, apartamento)
      await reportError('[ocr]', new Error('resposta do modelo não é JSON válido'))
      report('invalid_response')
      return null
    }

    if (!parsed.resident_id) {
      report('no_match')
      return null
    }

    // O id devolvido tem que estar na lista enviada (alucinação ou morador de outro condomínio)
    const match = residents.find((r) => r.id === parsed.resident_id)
    if (!match) {
      await reportError('[ocr]', new Error('modelo devolveu morador que não está na lista'))
      report('invalid_response')
      return null
    }

    const confidence = (['high', 'medium', 'low'].includes(parsed.confidence)
      ? parsed.confidence
      : 'low') as OcrResult['confidence']
    report('matched', confidence)

    return {
      resident_id: parsed.resident_id,
      confidence,
      extracted_text: parsed.extracted_text ?? '',
    }
  } catch (err) {
    // Falha do Gemini (modelo aposentado, cota, rede): o fallback é silencioso para o porteiro
    await reportError('[ocr]', err)
    report('error')
    return null
  }
}
