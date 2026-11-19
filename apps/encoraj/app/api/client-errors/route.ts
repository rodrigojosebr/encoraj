import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth/session'
import { checkRateLimit } from '@/lib/auth/rateLimit'
import { reportError } from '@/lib/observability/report'

const schema = z.object({
  message: z.string().trim().min(1).max(500),
  /** Identificador que o Next dá ao erro — casa com o log do servidor */
  digest: z.string().max(100).optional(),
  path: z.string().max(200).optional(),
})

/**
 * Recebe erros que estouraram na tela do usuário (error.tsx). Só de quem está logado,
 * e com limite por usuário — não é um endpoint aberto para escrever no nosso log.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

    const rl = await checkRateLimit(`client-error:${session.userId}`, 10, 10 * 60 * 1000)
    if (rl.blocked) return NextResponse.json({ error: 'Muitos relatos' }, { status: 429 })

    const { message, digest, path } = parsed.data
    await reportError('[tela]', new Error(message), {
      digest,
      path: path?.split('?')[0],
      roles: session.roles.join(', '),
      condoId: session.condoId,
      userId: session.userId,
    })

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    await reportError('[POST /api/client-errors]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
