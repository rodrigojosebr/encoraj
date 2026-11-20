/**
 * Regra de senha que a tela também precisa conhecer. Sem dependência de servidor:
 * componente de cliente importa daqui, nunca de `password.ts` (que traz o bcrypt).
 */
export const PASSWORD_MIN = 8
export const PASSWORD_MIN_MESSAGE = `A senha deve ter pelo menos ${PASSWORD_MIN} caracteres.`
export const PASSWORD_MIN_HINT = `Mínimo ${PASSWORD_MIN} caracteres`
