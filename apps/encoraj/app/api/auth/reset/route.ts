import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { hash } from 'bcryptjs'
import { z } from 'zod'
import { users, passwordResetTokens } from '@/lib/db/collections'

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.'),
})

export async function POST(request: NextRequest) {
  try {
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

    const tokensCol = await passwordResetTokens()
    const tokenDoc = await tokensCol.findOne({ token_hash: tokenHash })

    if (!tokenDoc) {
      return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 400 })
    }
    if (tokenDoc.used_at) {
      return NextResponse.json({ error: 'Este link já foi utilizado.' }, { status: 400 })
    }
    if (tokenDoc.expires_at < new Date()) {
      return NextResponse.json({ error: 'Link expirado. Solicite um novo.' }, { status: 400 })
    }

    const passwordHash = await hash(password, 10)

    const usersCol = await users()
    await usersCol.updateOne(
      { _id: tokenDoc.user_id },
      { $set: { password_hash: passwordHash } }
    )

    await tokensCol.updateOne(
      { _id: tokenDoc._id },
      { $set: { used_at: new Date() } }
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[reset]', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
