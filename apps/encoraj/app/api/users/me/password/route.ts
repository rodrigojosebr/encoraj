import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { users } from '@/lib/db/collections'
import { getSessionForPasswordChange } from '@/lib/auth/session'
import { hashPassword, passwordSchema } from '@/lib/auth/password'
import { setSessionCookie } from '@/lib/auth/cookies'
import { verifyCurrentPassword } from '@/lib/auth/current-password'
import { logAction } from '@/lib/audit/log'
import { badRequest, parseBody, serverError, tooManyRequests, unauthorized } from '@/lib/api/http'

const schema = z.object({
  current_password: z.string().min(1, 'Informe a senha atual.'),
  new_password: passwordSchema,
})

export async function PUT(request: Request) {
  try {
    // Única rota que aceita quem ainda precisa trocar a senha recebida de outra pessoa
    const session = await getSessionForPasswordChange()
    if (!session) {
      return unauthorized()
    }

    const parsed = await parseBody(request, schema)
    if (parsed.error) return parsed.error

    const { current_password, new_password } = parsed.data

    const current = await verifyCurrentPassword(session.userId, current_password)
    if (current === 'blocked') return tooManyRequests()
    if (current === 'wrong') return badRequest('Senha atual incorreta.')

    if (new_password === current_password) {
      return badRequest('A nova senha precisa ser diferente da atual.')
    }

    const userId = new ObjectId(session.userId)
    const newHash = await hashPassword(new_password)
    await (await users()).updateOne(
      { _id: userId },
      { $set: { password_hash: newHash, password_changed_at: new Date() }, $unset: { must_change_password: '' } },
    )

    await logAction({
      condo_id: new ObjectId(session.condoId),
      entity: 'users',
      entity_id: userId,
      action: 'updated',
      actor_id: userId,
      actor_name: session.userName,
      after: { password_changed: true },
    })

    // password_changed_at derruba todas as sessões antigas; re-assina a atual para
    // quem trocou a senha continuar logado neste dispositivo.
    const response = NextResponse.json({ ok: true })
    await setSessionCookie(response, session)
    return response
  } catch (err) {
    return serverError('[me/password]', err)
  }
}
