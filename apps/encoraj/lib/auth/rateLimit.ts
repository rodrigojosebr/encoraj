import { rateLimits } from '@/lib/db/collections'

interface RateLimitResult {
  blocked: boolean
  remaining: number
  retryAfter?: Date
}

/**
 * Verifica e incrementa o contador de tentativas para uma chave.
 * Usa MongoDB com TTL index para limpar automaticamente janelas expiradas.
 *
 * @param key     identificador único (ex: `login:1.2.3.4`, `forgot:email@x.com`)
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

  // upsert: cria o doc se não existe, incrementa attempts se já existe e ainda não expirou
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
