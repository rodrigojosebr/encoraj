import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { PASSWORD_MIN, PASSWORD_MIN_MESSAGE } from './password-rules'

/** Senha mínima única do app (a regra mora em `password-rules.ts`, que a tela também lê). */
export const passwordSchema = z.string().min(PASSWORD_MIN, PASSWORD_MIN_MESSAGE)

/** Custo do bcrypt. Um só para o app inteiro: toda senha gravada passa por hashPassword(). */
const BCRYPT_COST = 12

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST)
}
