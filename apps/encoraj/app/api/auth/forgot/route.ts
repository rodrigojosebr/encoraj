import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, createHash } from 'crypto'
import { z } from 'zod'
import { users, condominiums, passwordResetTokens } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { sendEmail } from '@/lib/email/mailer'
import { resetPasswordEmail } from '@/lib/email/templates'
import { checkRateLimit, clientIp } from '@/lib/auth/rateLimit'
import { emailSchema } from '@/lib/auth/email'
import { reportError } from '@/lib/observability/report'
import { parseBody, serverError } from '@/lib/api/http'

const schema = z.object({ email: emailSchema })

const HOUR_MS = 60 * 60 * 1000

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseBody(request, schema)
    if (parsed.error) return parsed.error

    const { email } = parsed.data

    // Rate limit: 3 por email e 10 por IP a cada 1h. Estourou → 200 mesmo assim,
    // para não revelar nada sobre o email.
    const [byEmail, byIp] = await Promise.all([
      checkRateLimit(`forgot:${email}`, 3, HOUR_MS),
      checkRateLimit(`forgot-ip:${clientIp(request.headers)}`, 10, HOUR_MS),
    ])
    if (byEmail.blocked || byIp.blocked) {
      return NextResponse.json({ ok: true })
    }

    // Só contas ativas recebem link (conta desativada não volta por aqui)
    const usersCol = await users()
    const matchingUsers = await usersCol
      .find({ email, status_id: (await getStatus('active'))._id })
      .toArray()

    // Responde sempre 200 — não revela se o email existe
    if (matchingUsers.length === 0) {
      return NextResponse.json({ ok: true })
    }

    // O link aponta para a URL configurada do app, não para o Host do request
    const baseUrl = (process.env.APP_URL || new URL(request.url).origin).replace(/\/$/, '')
    const condosCol = await condominiums()
    const tokensCol = await passwordResetTokens()

    await Promise.all(
      matchingUsers.map(async (user) => {
        const token = randomBytes(32).toString('hex')
        const tokenHash = createHash('sha256').update(token).digest('hex')

        // Pedido novo invalida os links anteriores ainda não usados
        await tokensCol.deleteMany({ user_id: user._id, used_at: { $exists: false } })
        await tokensCol.insertOne({
          user_id: user._id,
          token_hash: tokenHash,
          expires_at: new Date(Date.now() + HOUR_MS),
        })

        const condo = await condosCol.findOne({ _id: user.condo_id })

        try {
          await sendEmail({
            to: user.email,
            subject: 'Redefinir senha — Encoraj',
            html: resetPasswordEmail({
              name: user.name,
              condoName: condo?.name ?? 'Encoraj',
              resetUrl: `${baseUrl}/reset-password?token=${token}`,
            }),
          })
        } catch (err) {
          // Falha de SMTP não pode virar resposta diferente (revelaria que o email existe)
          await reportError('[forgot] envio falhou', err)
        }
      }),
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    return serverError('[forgot]', err)
  }
}
