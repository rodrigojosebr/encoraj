import { createHash } from 'crypto'

/**
 * Ponto único de registro de erro do servidor.
 *
 *   1. Sempre escreve o erro completo no log do servidor (Vercel → Logs).
 *   2. Guarda o erro, agrupado, na coleção `error_logs` — é o que a tela de super
 *      admin (/admin/errors) mostra.
 *
 * Nada sai do sistema: não há envio para serviço externo. O que é gravado nunca leva
 * dado pessoal — emails, telefones, tokens e links assinados são mascarados antes.
 * Nunca lança: monitoramento que falha não pode derrubar o request que já está falhando.
 *
 * Limite conhecido: se o problema for o próprio banco, o erro fica só no log do servidor.
 */

const MAX_MESSAGE = 300

/** Tira do texto tudo que pode identificar alguém ou dar acesso a algo. */
export function redact(text: string): string {
  return (
    text
      // links primeiro: tira a query (assinatura do S3, tokens) e usuário:senha
      .replace(/\b(mongodb(\+srv)?|https?):\/\/[^\s"'<>]+/g, (url) =>
        url.split('?')[0].replace(/\/\/[^/@]*@/, '//[credenciais]@'),
      )
      .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[email]')
      .replace(/\beyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,}\b/g, '[token]')
      // sequência longa de dígitos solta no texto (telefone, CPF) — ids hexadecimais ficam
      .replace(/(?<![\w])\+?\d[\d\s().-]{8,}\d(?![\w])/g, '[número]')
  )
}

function describe(error: unknown): { name: string; message: string } {
  if (error instanceof Error) return { name: error.name, message: error.message }
  return { name: 'Erro', message: typeof error === 'string' ? error : JSON.stringify(error) ?? String(error) }
}

const MAX_STACK = 4000

function fingerprintOf(label: string, name: string, safeMessage: string): string {
  return createHash('sha1').update(`${label}|${name}|${safeMessage}`).digest('hex')
}

/**
 * Guarda o erro para a tela de super admin (/admin/errors). O mesmo erro vira um
 * registro só, com contador; se voltar a acontecer depois de resolvido, reabre.
 * Se o problema for o próprio banco, isto falha — e o erro continua no log do servidor.
 */
async function storeError(label: string, error: unknown, extra: Record<string, string | undefined>): Promise<void> {
  const { name, message } = describe(error)
  const safeMessage = redact(message).slice(0, MAX_MESSAGE)
  const now = new Date()
  const cleanExtra = Object.fromEntries(
    Object.entries(extra)
      .filter((entry): entry is [string, string] => !!entry[1])
      .map(([key, value]) => [key, redact(value)]),
  )

  // import tardio: lib/db importa este módulo (índices), e o ciclo não pode travar a carga
  const { errorLogs } = await import('@/lib/db/collections')
  await (await errorLogs()).updateOne(
    { fingerprint: fingerprintOf(label, name, safeMessage) },
    {
      $setOnInsert: { label, name, first_at: now },
      $set: {
        message: safeMessage,
        ...(error instanceof Error && error.stack ? { stack: redact(error.stack).slice(0, MAX_STACK) } : {}),
        extra: cleanExtra,
        env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'local',
        last_at: now,
      },
      $inc: { count: 1 },
      $unset: { resolved_at: '', resolved_by: '' },
    },
    { upsert: true },
  )
}

/**
 * Registra um erro. Mesma ordem de argumentos do `console.error` que substitui.
 *
 * @param label  de onde veio, entre colchetes: `[MÉTODO /api/rota]` em rota (`[POST /api/packages]`);
 *               fora de rota, o módulo em inglês (`[ocr]`, `[ai-usage]`, `[indexes]`, `[client]` = erro da tela)
 * @param extra  contexto curto e sem dado pessoal (ids, rota) — fica nos detalhes do erro
 */
export async function reportError(
  label: string,
  error: unknown,
  extra: Record<string, string | undefined> = {},
): Promise<void> {
  console.error(label, error)
  try {
    await storeError(label, error, extra)
  } catch (storeFailure) {
    console.error('[error-log]', storeFailure)
  }
}
