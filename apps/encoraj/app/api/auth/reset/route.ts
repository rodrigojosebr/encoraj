import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { hash } from 'bcryptjs'
import { z } from 'zod'
import { users, passwordResetTokens } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { passwordSchema } from '@/lib/auth/email'
import { checkRateLimit, clientIp } from '@/lib/auth/rateLimit'
import { logAction } from '@/lib/audit/log'

const schema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
})

const INVALID_LINK = 'Link inválido ou expirado. Solicite um novo.'

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 tentativas por IP a cada 15 min
    const rl = await checkRateLimit(`reset:${clientIp(request.headers)}`, 10, 15 * 60 * 1000)
    if (rl.blocked) {
      return NextResponse.json({ error: 'Muitas tentativas. Tente novamente em alguns minutos.' }, { status: 429 })
    }

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' },
        { status: 400 }
      )
    }

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
      return NextResponse.json({ error: INVALID_LINK }, { status: 400 })
    }

    const usersCol = await users()
    const user = await usersCol.findOneAndUpdate(
      { _id: tokenDoc.user_id, status_id: (await getStatus('active'))._id },
      // password_changed_at derruba as sessões abertas (ver lib/auth/session.ts)
      { $set: { password_hash: await hash(password, 10), password_changed_at: now } },
    )
    if (!user) {
      // Conta desativada depois de pedir o link
      return NextResponse.json({ error: INVALID_LINK }, { status: 400 })
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
    console.error('[reset]', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
