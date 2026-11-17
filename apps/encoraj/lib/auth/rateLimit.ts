import { rateLimits } from '@/lib/db/collections'

interface RateLimitResult {
  blocked: boolean
  remaining: number
  retryAfter?: Date
}

/**
 * Incrementa o contador da chave e diz se o limite foi estourado.
 * Usa MongoDB com TTL index para limpar automaticamente janelas expiradas.
 *
 * @param key     identificador único (ex: `register:1.2.3.4`, `forgot:email@x.com`)
 * @param max     máximo de tentativas permitidas na janela
 * @param windowMs duração da janela em milissegundos
 */
export async function checkRateLimit(
  key: string,
  max: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const col = await rateLimits()
  const now = new Date()
  const resetAt = new Date(now.getTime() + windowMs)

  // O TTL do MongoDB roda a cada ~60s: uma janela vencida pode ainda estar no banco.
  await col.deleteOne({ key, reset_at: { $lte: now } })

  // upsert: cria o doc se não existe, incrementa attempts se já existe
  const result = await col.findOneAndUpdate(
    { key },
    {
      $inc: { attempts: 1 },
      $setOnInsert: { reset_at: resetAt },
    },
    { upsert: true, returnDocument: 'after' },
  )

  const doc = result!
  const attempts = doc.attempts

  if (attempts > max) {
    return { blocked: true, remaining: 0, retryAfter: doc.reset_at }
  }

  return { blocked: false, remaining: max - attempts }
}

/** Consulta sem incrementar — para limites que contam só falhas (login, PIN). */
export async function isRateLimited(key: string, max: number): Promise<boolean> {
  const col = await rateLimits()
  const doc = await col.findOne({ key, reset_at: { $gt: new Date() } })
  return !!doc && doc.attempts >= max
}

/** Zera o contador (ex.: depois de um login bem-sucedido). */
export async function clearRateLimit(key: string): Promise<void> {
  const col = await rateLimits()
  await col.deleteOne({ key })
}

/** IP do cliente. Na Vercel o `x-forwarded-for` é sobrescrito pela plataforma. */
export function clientIp(headers: { get(name: string): string | null }): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}
