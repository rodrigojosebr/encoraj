import { GoogleGenerativeAI } from '@google/generative-ai'

export interface ResidentContext {
  id: string
  name: string
  apartment: string
  bloco?: string
}

export interface OcrResult {
  resident_id: string
  confidence: 'high' | 'medium' | 'low'
  extracted_text: string
}

const PROMPT_TEMPLATE = (residents: ResidentContext[]) => `
You are analyzing a package delivery label photo.
Your task is to identify which resident in the list below is the intended recipient.

RESIDENTS LIST:
${residents.map((r) => `- id: ${r.id} | name: ${r.name} | apartment: ${r.apartment}${r.bloco ? ` | bloco: ${r.bloco}` : ''}`).join('\n')}

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
): Promise<OcrResult | null> {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('[OCR] GEMINI_API_KEY not set')
      return null
    }

    if (residents.length === 0) return null

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const result = await model.generateContent([
      { text: PROMPT_TEMPLATE(residents) },
      {
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      },
    ])

    const text = result.response.text().trim()

    // Strip markdown code fences if Gemini wraps the JSON anyway
    const jsonText = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

    let parsed: { resident_id: string | null; confidence: string; extracted_text: string }
    try {
      parsed = JSON.parse(jsonText)
    } catch {
      console.error('[OCR] Failed to parse Gemini response:', text)
      return null
    }

    if (!parsed.resident_id) return null

    // Validate that the returned id actually exists in our list
    const match = residents.find((r) => r.id === parsed.resident_id)
    if (!match) {
      console.warn('[OCR] Gemini returned unknown resident_id:', parsed.resident_id)
      return null
    }

    return {
      resident_id: parsed.resident_id,
      confidence: (['high', 'medium', 'low'].includes(parsed.confidence)
        ? parsed.confidence
        : 'low') as OcrResult['confidence'],
      extracted_text: parsed.extracted_text ?? '',
    }
  } catch (err) {
    console.error('[OCR] analyzePackageLabel error:', err)
    return null
  }
}
