import { NextResponse } from 'next/server'
import type { z } from 'zod'
import { reportError } from '@/lib/observability/report'

/**
 * Respostas padrão das rotas de API. Toda rota usa estas — nenhuma escreve 401/403/500
 * à mão — para as mensagens saírem iguais em todo o app.
 *
 * Mensagem de erro é frase: começa com maiúscula e termina com ponto.
 */
export const INVALID_DATA = 'Dados inválidos.'

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
}

export function forbidden(): NextResponse {
  return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
}

export function badRequest(error: string = INVALID_DATA): NextResponse {
  return NextResponse.json({ error }, { status: 400 })
}

export function notFound(error: string): NextResponse {
  return NextResponse.json({ error }, { status: 404 })
}

export function conflict(error: string): NextResponse {
  return NextResponse.json({ error }, { status: 409 })
}

export function tooManyRequests(error = 'Muitas tentativas. Tente novamente em alguns minutos.'): NextResponse {
  return NextResponse.json({ error }, { status: 429 })
}

/** Registra o erro (ver reportError) e responde 500 sem vazar detalhe. */
export async function serverError(label: string, err: unknown): Promise<NextResponse> {
  await reportError(label, err)
  return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
}

/**
 * Lê o corpo JSON e valida com o schema. Corpo ilegível ou fora do schema → 400 com a
 * mensagem escrita no schema; campo sem mensagem própria cai em "Dados inválidos." (as
 * mensagens padrão do Zod são em inglês e técnicas — não chegam à tela).
 *
 *   const parsed = await parseBody(request, schema)
 *   if (parsed.error) return parsed.error
 *   parsed.data …
 */
export async function parseBody<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<{ data: z.output<S>; error?: never } | { data?: never; error: NextResponse }> {
  const body: unknown = await request.json().catch(() => undefined)
  const result = schema.safeParse(body, { error: () => INVALID_DATA })
  if (!result.success) return { error: badRequest(result.error.issues[0]?.message ?? INVALID_DATA) }
  return { data: result.data }
}
