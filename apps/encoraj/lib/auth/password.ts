import bcrypt from 'bcryptjs'
import { z } from 'zod'

/** Senha mínima única do app. */
export const PASSWORD_MIN = 8
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `A senha deve ter pelo menos ${PASSWORD_MIN} caracteres.`)

/** Custo do bcrypt. Um só para o app inteiro: toda senha gravada passa por hashPassword(). */
const BCRYPT_COST = 12

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST)
}
