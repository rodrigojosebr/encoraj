import { z } from 'zod'

/** Limites dos campos do morador: o cadastro manual e a importação por planilha usam os mesmos. */
export const RESIDENT_LIMITS = { nameMin: 2, nameMax: 120, unitMax: 20 } as const

/** Campos do morador como chegam à API. A edição usa `.partial()`. */
export const residentSchema = z.object({
  name: z.string().trim().min(RESIDENT_LIMITS.nameMin).max(RESIDENT_LIMITS.nameMax),
  apartment: z.string().trim().min(1).max(RESIDENT_LIMITS.unitMax),
  block: z.string().trim().max(RESIDENT_LIMITS.unitMax).optional(),
  whatsapp: z.string().trim().min(8).max(20),
})
