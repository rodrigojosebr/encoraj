import { ObjectId } from 'mongodb'
import { aiUsage, condominiums, type AiOutcome } from '@/lib/db/collections'
import { addDays, tzParts } from '@/lib/date/tz'
import { reportError } from '@/lib/observability/report'
import type { OcrUsage } from '@/lib/gemini/ocr'
import type { Period } from '@/lib/reports/management'

/**
 * Monitoramento do uso de IA (hoje: leitura de etiqueta pelo Gemini).
 * Cada chamada vira um registro com modelo, resultado, tokens e tempo — nunca o texto
 * lido nem a imagem. Visível só para o super admin, em /admin/ai.
 */

/** Teto de registros lidos por relatório */
export const MAX_USAGE_DOCS = 100_000
export const TOP_CONDOS = 15

/** Grava uma chamada. Nunca lança: monitoramento não pode atrapalhar o registro da encomenda. */
export async function recordAiUsage(input: {
  condoId: string
  userId: string
  imageBytes: number
  usage: OcrUsage
}): Promise<void> {
  try {
    const { usage } = input
    await (await aiUsage()).insertOne({
      condo_id: new ObjectId(input.condoId),
      user_id: new ObjectId(input.userId),
      feature: 'ocr',
      model: usage.model,
      outcome: usage.outcome,
      ...(usage.confidence ? { confidence: usage.confidence } : {}),
      prompt_tokens: usage.promptTokens,
      output_tokens: usage.outputTokens,
      total_tokens: usage.totalTokens,
      latency_ms: usage.latencyMs,
      image_bytes: input.imageBytes,
      created_at: new Date(),
    })
  } catch (err) {
    await reportError('[uso de IA]', err)
  }
}

export interface AiPricing {
  /** USD por 1 milhão de tokens */
  inputPerMillion: number
  outputPerMillion: number
}

/**
 * Preço do modelo, vindo do ambiente — não fica fixo no código porque a tabela do
 * provedor muda. Sem as duas variáveis, o relatório mostra tokens e não mostra custo.
 */
export function aiPricing(): AiPricing | null {
  const parse = (raw: string | undefined) => {
    const value = raw?.trim() ? Number(raw.replace(',', '.')) : NaN
    return Number.isFinite(value) && value >= 0 ? value : null
  }
  const inputPerMillion = parse(process.env.AI_PRICE_INPUT_USD_PER_MTOK)
  const outputPerMillion = parse(process.env.AI_PRICE_OUTPUT_USD_PER_MTOK)
  return inputPerMillion === null || outputPerMillion === null ? null : { inputPerMillion, outputPerMillion }
}

function costOf(promptTokens: number, outputTokens: number, pricing: AiPricing | null): number | null {
  if (!pricing) return null
  return (promptTokens * pricing.inputPerMillion + outputTokens * pricing.outputPerMillion) / 1_000_000
}

interface Totals {
  calls: number
  matched: number
  promptTokens: number
  outputTokens: number
  totalTokens: number
}

const emptyTotals = (): Totals => ({ calls: 0, matched: 0, promptTokens: 0, outputTokens: 0, totalTokens: 0 })

export interface AiUsageReport {
  period: Period
  truncated: boolean
  pricing: AiPricing | null
  totals: Totals & {
    byOutcome: Record<AiOutcome, number>
    /** % das chamadas em que o modelo apontou um morador */
    matchPct: number | null
    avgLatencyMs: number | null
    /** Maior tempo de resposta do período */
    maxLatencyMs: number | null
    avgImageKb: number | null
    costUsd: number | null
    /** Custo médio por chamada */
    costPerCallUsd: number | null
  }
  byDay: Array<{ date: string; calls: number; failures: number; totalTokens: number }>
  byModel: Array<Totals & { model: string; costUsd: number | null }>
  byCondo: Array<Totals & { condoId: string; name: string; costUsd: number | null }>
}

const FAILURES: AiOutcome[] = ['error', 'disabled', 'invalid_response']

export async function getAiUsageReport(period: Period): Promise<AiUsageReport> {
  const pricing = aiPricing()
  const docs = await (await aiUsage())
    .find({ created_at: { $gte: period.from, $lt: period.to } }, { projection: { user_id: 0 } })
    .sort({ created_at: -1 })
    .limit(MAX_USAGE_DOCS)
    .toArray()

  const dayIndex = new Map<string, { date: string; calls: number; failures: number; totalTokens: number }>()
  for (let i = 0; i < period.days; i++) {
    const date = addDays(period.fromStr, i)
    dayIndex.set(date, { date, calls: 0, failures: 0, totalTokens: 0 })
  }

  const totals = emptyTotals()
  const byOutcome: Record<AiOutcome, number> = { matched: 0, no_match: 0, invalid_response: 0, error: 0, disabled: 0 }
  const modelIndex = new Map<string, Totals>()
  const condoIndex = new Map<string, Totals>()
  let latencySum = 0
  let latencyMax = 0
  let imageBytes = 0

  const add = (target: Totals, doc: (typeof docs)[number]) => {
    target.calls++
    if (doc.outcome === 'matched') target.matched++
    target.promptTokens += doc.prompt_tokens
    target.outputTokens += doc.output_tokens
    target.totalTokens += doc.total_tokens
  }
  const bucket = (index: Map<string, Totals>, key: string) => {
    let row = index.get(key)
    if (!row) index.set(key, (row = emptyTotals()))
    return row
  }

  for (const doc of docs) {
    add(totals, doc)
    add(bucket(modelIndex, doc.model), doc)
    add(bucket(condoIndex, doc.condo_id.toString()), doc)
    byOutcome[doc.outcome]++
    latencySum += doc.latency_ms
    latencyMax = Math.max(latencyMax, doc.latency_ms)
    imageBytes += doc.image_bytes

    const day = dayIndex.get(tzParts(doc.created_at).date)
    if (day) {
      day.calls++
      day.totalTokens += doc.total_tokens
      if (FAILURES.includes(doc.outcome)) day.failures++
    }
  }

  const condoIds = [...condoIndex.keys()].map((id) => new ObjectId(id))
  const condoDocs = condoIds.length
    ? await (await condominiums()).find({ _id: { $in: condoIds } }, { projection: { name: 1 } }).toArray()
    : []
  const condoNames = new Map(condoDocs.map((c) => [c._id.toString(), c.name]))

  const withCost = <T extends Totals>(row: T) => ({ ...row, costUsd: costOf(row.promptTokens, row.outputTokens, pricing) })
  const byCalls = (a: Totals, b: Totals) => b.calls - a.calls || b.totalTokens - a.totalTokens
  const costUsd = costOf(totals.promptTokens, totals.outputTokens, pricing)

  return {
    period,
    truncated: docs.length >= MAX_USAGE_DOCS,
    pricing,
    totals: {
      ...totals,
      byOutcome,
      matchPct: totals.calls ? Math.round((totals.matched / totals.calls) * 1000) / 10 : null,
      avgLatencyMs: totals.calls ? Math.round(latencySum / totals.calls) : null,
      maxLatencyMs: totals.calls ? latencyMax : null,
      avgImageKb: totals.calls ? Math.round(imageBytes / totals.calls / 1024) : null,
      costUsd,
      costPerCallUsd: costUsd !== null && totals.calls ? costUsd / totals.calls : null,
    },
    byDay: [...dayIndex.values()],
    byModel: [...modelIndex.entries()].map(([model, row]) => withCost({ model, ...row })).sort(byCalls),
    byCondo: [...condoIndex.entries()]
      .map(([condoId, row]) => withCost({ condoId, name: condoNames.get(condoId) ?? 'Condomínio removido', ...row }))
      .sort(byCalls)
      .slice(0, TOP_CONDOS),
  }
}
