import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { compare } from 'bcryptjs'
import { z } from 'zod'
import { getSession } from '@/lib/auth/session'
import { users } from '@/lib/db/collections'
import { AUTH_COOKIE, COOKIE_OPTIONS } from '@/lib/auth/cookies'
import { checkRateLimit, isRateLimited } from '@/lib/auth/rateLimit'
import { eraseCondo } from '@/lib/lgpd/erase'

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
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (session.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

    const parsed = schema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Envie { "confirm": "<nome exato do condomínio>", "password": "<sua senha>" }.' },
        { status: 400 },
      )
    }

    const rlKey = `pwd:${session.userId}`
    if (await isRateLimited(rlKey, 5)) {
      return NextResponse.json({ error: 'Muitas tentativas. Tente novamente em alguns minutos.' }, { status: 429 })
    }

    if (parsed.data.confirm !== session.condoName) {
      return NextResponse.json({ error: 'O nome informado não confere com o do condomínio.' }, { status: 400 })
    }

    const admin = await (await users()).findOne(
      { _id: new ObjectId(session.userId) },
      { projection: { password_hash: 1 } },
    )
    if (!admin || !(await compare(parsed.data.password, admin.password_hash))) {
      await checkRateLimit(rlKey, 5, 15 * 60 * 1000)
      return NextResponse.json({ error: 'Senha incorreta.' }, { status: 400 })
    }

    const result = await eraseCondo(new ObjectId(session.condoId))
    if (!result) return NextResponse.json({ error: 'Condomínio não encontrado' }, { status: 404 })
    // Não sobra audit log (foi junto): o registro da operação fica no log do servidor
    console.info('[condo/erase]', { condo_id: session.condoId, actor_id: session.userId, ...result })

    const response = NextResponse.json({ ok: true, ...result })
    response.cookies.set(AUTH_COOKIE, '', { ...COOKIE_OPTIONS, maxAge: 0 })
    return response
  } catch (err) {
    console.error('[DELETE /api/condo/erase]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
