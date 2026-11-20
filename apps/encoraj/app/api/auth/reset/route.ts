import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { z } from 'zod'
import { users, passwordResetTokens } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { hashPassword, passwordSchema } from '@/lib/auth/password'
import { checkRateLimit, clientIp } from '@/lib/auth/rate-limit'
import { logAction } from '@/lib/audit/log'
import { badRequest, parseBody, serverError, tooManyRequests } from '@/lib/api/http'

const schema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
})

const INVALID_LINK = 'Link inválido ou expirado. Solicite um novo.'

/** Tentativas por IP a cada 15 minutos. */
const MAX_PER_IP = 10
const WINDOW_MS = 15 * 60 * 1000

export async function POST(request: NextRequest) {
  try {
    const rl = await checkRateLimit(`reset:${clientIp(request.headers)}`, MAX_PER_IP, WINDOW_MS)
    if (rl.blocked) {
      return tooManyRequests()
    }

    const parsed = await parseBody(request, schema)
    if (parsed.error) return parsed.error

    const { token, password } = parsed.data
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const now = new Date()

    // Consome o token de forma atômica: dois requests com o mesmo link, só um passa
    const tokensCol = await passwordResetTokens()
    const tokenDoc = await tokensCol.findOneAndUpdate(
      { token_hash: tokenHash, used_at: { $exists: false }, expires_at: { $gt: now } },
      { $set: { used_at: now } },
    )
    if (!tokenDoc) {
      return badRequest(INVALID_LINK)
    }

    const usersCol = await users()
    const user = await usersCol.findOneAndUpdate(
      { _id: tokenDoc.user_id, status_id: (await getStatus('active'))._id },
      // password_changed_at derruba as sessões abertas (ver lib/auth/session.ts)
      // Senha escolhida pelo próprio dono (provou o email): não precisa trocar de novo
      { $set: { password_hash: await hashPassword(password), password_changed_at: now }, $unset: { must_change_password: '' } },
    )
    if (!user) {
      // Conta desativada depois de pedir o link
      return badRequest(INVALID_LINK)
    }

    // Qualquer outro link pendente dessa conta deixa de valer
    await tokensCol.deleteMany({ user_id: user._id, used_at: { $exists: false } })

    await logAction({
      condo_id: user.condo_id,
      entity: 'users',
      entity_id: user._id,
      action: 'updated',
      actor_id: user._id,
      actor_name: user.name,
      after: { password_reset: true },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return serverError('[POST /api/auth/reset]', err)
  }
}
