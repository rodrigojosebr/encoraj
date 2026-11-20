import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { getSession } from '@/lib/auth/session'
import { clearSessionCookie } from '@/lib/auth/cookies'
import { verifyCurrentPassword } from '@/lib/auth/current-password'
import { eraseCondo } from '@/lib/lgpd/erase'
import { can } from '@/lib/auth/permissions'
import { badRequest, forbidden, notFound, parseBody, serverError, tooManyRequests, unauthorized } from '@/lib/api/http'

const schema = z.object({
  /** Nome exato do condomínio, como está cadastrado */
  confirm: z.string().min(1),
  /** Senha do admin que está pedindo */
  password: z.string().min(1),
})

/**
 * Remoção DEFINITIVA do condomínio inteiro: arquivos, encomendas, moradores, usuários e
 * auditoria. Só admin; sem botão na interface. Exige o nome exato do condomínio e a senha
 * de quem pede. Não tem como desfazer.
 */
export async function DELETE(request: Request) {
  try {
    const session = await getSession()
    if (!session) return unauthorized()
    if (!can(session, 'data.erase')) return forbidden()

    const parsed = await parseBody(request, schema)
    if (parsed.error) {
      return badRequest('Envie { "confirm": "<nome exato do condomínio>", "password": "<sua senha>" }.')
    }

    if (parsed.data.confirm !== session.condoName) {
      return badRequest('O nome informado não confere com o do condomínio.')
    }

    const password = await verifyCurrentPassword(session.userId, parsed.data.password)
    if (password === 'blocked') return tooManyRequests()
    if (password === 'wrong') return badRequest('Senha incorreta.')

    const result = await eraseCondo(new ObjectId(session.condoId))
    if (!result) return notFound('Condomínio não encontrado.')
    // Não sobra audit log (foi junto): o registro da operação fica no log do servidor
    console.info('[condo/erase]', { condo_id: session.condoId, actor_id: session.userId, ...result })

    const response = NextResponse.json({ ok: true, ...result })
    clearSessionCookie(response)
    return response
  } catch (err) {
    return serverError('[DELETE /api/condo/erase]', err)
  }
}
