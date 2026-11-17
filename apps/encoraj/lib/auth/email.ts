import { z } from 'zod'

/** Email sempre gravado e comparado em minúsculas, sem espaços nas pontas. */
export const emailSchema = z.string().trim().toLowerCase().email()

/** Senha mínima única do app. */
export const PASSWORD_MIN = 8
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `A senha deve ter pelo menos ${PASSWORD_MIN} caracteres.`)

/**
 * Comparação de email ignorando maiúsculas/minúsculas — cobre registros antigos,
 * gravados antes da normalização.
 */
export const EMAIL_COLLATION = { locale: 'en', strength: 2 } as const
