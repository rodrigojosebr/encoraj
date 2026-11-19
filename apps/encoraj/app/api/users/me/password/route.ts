import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { compare, hash } from 'bcryptjs'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { users } from '@/lib/db/collections'
import { getSessionForPasswordChange } from '@/lib/auth/session'
import { passwordSchema } from '@/lib/auth/email'
import { signToken, verifyToken } from '@/lib/auth/jwt'
import { AUTH_COOKIE, COOKIE_OPTIONS } from '@/lib/auth/cookies'
import { checkRateLimit, isRateLimited } from '@/lib/auth/rateLimit'
import { logAction } from '@/lib/audit/log'
import { reportError } from '@/lib/observability/report'

const schema = z.object({
  current_password: z.string().min(1, 'Informe a senha atual.'),
  new_password: passwordSchema,
})

export async function PUT(request: Request) {
  try {
    // Única rota que aceita quem ainda precisa trocar a senha recebida de outra pessoa
    const session = await getSessionForPasswordChange()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' },
        { status: 400 }
      )
    }

    const { current_password, new_password } = parsed.data

    // Sessão roubada não pode ficar chutando a senha atual
    const rlKey = `pwd:${session.userId}`
    if (await isRateLimited(rlKey, 5)) {
      return NextResponse.json({ error: 'Muitas tentativas. Tente novamente em alguns minutos.' }, { status: 429 })
    }

    const col = await users()
    const user = await col.findOne({ _id: new ObjectId(session.userId) })

    /* v8 ignore next 3 -- @preserve: getSession() já garantiu que o usuário existe */
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })
    }

    const valid = await compare(current_password, user.password_hash)
    if (!valid) {
      await checkRateLimit(rlKey, 5, 15 * 60 * 1000)
      return NextResponse.json({ error: 'Senha atual incorreta.' }, { status: 400 })
    }

    if (new_password === current_password) {
      return NextResponse.json({ error: 'A nova senha precisa ser diferente da atual.' }, { status: 400 })
    }

    const newHash = await hash(new_password, 10)
    await col.updateOne(
      { _id: user._id },
      { $set: { password_hash: newHash, password_changed_at: new Date() }, $unset: { must_change_password: '' } },
    )

    await logAction({
      condo_id: new ObjectId(session.condoId),
      entity: 'users',
      entity_id: user._id!,
      action: 'updated',
      actor_id: user._id!,
      actor_name: session.userName,
      after: { password_changed: true },
    })

    // password_changed_at derruba todas as sessões antigas; re-assina a atual para
    // quem trocou a senha continuar logado neste dispositivo.
    const response = NextResponse.json({ ok: true })
    const currentToken = (await cookies()).get(AUTH_COOKIE)?.value
    if (currentToken) {
      try {
        const payload = await verifyToken(currentToken)
        response.cookies.set(AUTH_COOKIE, await signToken(payload), COOKIE_OPTIONS)
      } catch { /* token inválido — fará login de novo */ }
    }

    return response
  } catch (err) {
    await reportError('[me/password]', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
