import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, createHash } from 'crypto'
import { z } from 'zod'
import { users, condominiums, passwordResetTokens } from '@/lib/db/collections'
import { sendEmail } from '@/lib/email/mailer'
import { resetPasswordEmail } from '@/lib/email/templates'
import { checkRateLimit } from '@/lib/auth/rateLimit'

const schema = z.object({
  email: z.string().email(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })
    }

    const { email } = parsed.data

    // Rate limit: 3 tentativas por email a cada 1h
    const rl = await checkRateLimit(`forgot:${email.toLowerCase()}`, 3, 60 * 60 * 1000)
    if (rl.blocked) {
      // Retorna 200 mesmo assim — não revela informação sobre o email
      return NextResponse.json({ ok: true })
    }

    const baseUrl = new URL(request.url).origin

    // Busca todas as contas com esse email (multi-condo)
    const usersCol = await users()
    const matchingUsers = await usersCol
      .find({ email: email.toLowerCase() })
      .toArray()

    // Responde sempre 200 — não revela se o email existe
    if (matchingUsers.length === 0) {
      return NextResponse.json({ ok: true })
    }

    const condosCol = await condominiums()
    const tokensCol = await passwordResetTokens()

    // Para cada conta encontrada, gera um token e envia email
    await Promise.all(
      matchingUsers.map(async (user) => {
        const token = randomBytes(32).toString('hex')
        const tokenHash = createHash('sha256').update(token).digest('hex')
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1h

        await tokensCol.insertOne({
          user_id: user._id!,
          token_hash: tokenHash,
          expires_at: expiresAt,
        })

        const condo = await condosCol.findOne({ _id: user.condo_id })
        const resetUrl = `${baseUrl}/reset-password?token=${token}`

        await sendEmail({
          to: user.email,
          subject: 'Redefinir senha — Encoraj',
          html: resetPasswordEmail({
            name: user.name,
            condoName: condo?.name ?? 'Encoraj',
            resetUrl,
          }),
        })
      })
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[forgot]', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
