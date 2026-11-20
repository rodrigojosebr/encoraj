import { compare } from 'bcryptjs'
import { ObjectId } from 'mongodb'
import { users } from '@/lib/db/collections'
import { checkRateLimit, isRateLimited } from './rate-limit'

const MAX_FAILURES = 5
const WINDOW_MS = 15 * 60 * 1000

/**
 * Confere a senha de quem já está logado, antes de algo sensível (trocar a senha, apagar
 * o condomínio). Conta só as falhas, por usuário: sessão roubada não fica chutando a senha.
 * Os pedidos compartilham o mesmo contador.
 */
export async function verifyCurrentPassword(userId: string, password: string): Promise<'ok' | 'wrong' | 'blocked'> {
  const key = `pwd:${userId}`
  if (await isRateLimited(key, MAX_FAILURES)) return 'blocked'

  const user = await (await users()).findOne({ _id: new ObjectId(userId) }, { projection: { password_hash: 1 } })
  if (user && (await compare(password, user.password_hash))) return 'ok'

  await checkRateLimit(key, MAX_FAILURES, WINDOW_MS)
  return 'wrong'
}
