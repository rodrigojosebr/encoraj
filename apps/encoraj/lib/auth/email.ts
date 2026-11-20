import { z } from 'zod'

/** Email sempre gravado e comparado em minúsculas, sem espaços nas pontas. */
export const emailSchema = z.string().trim().toLowerCase().email('Email inválido.')
