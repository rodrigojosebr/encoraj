import type { Instrumentation } from 'next'

/**
 * Erros que NÃO passam pelos try/catch das rotas: falha ao renderizar página
 * (Server Component), no proxy ou em rota sem tratamento. O Next chama isto no servidor.
 *
 * O Next compila este arquivo também para o runtime Edge. O registro de erro usa
 * `crypto` e grava no MongoDB, então só é carregado no Node — e neste app nada roda no
 * Edge (no Next 16 o proxy roda em Node). Import dinâmico dentro do `if` para o
 * bundle do Edge nem chegar a incluir o módulo.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const { reportError } = await import('@/lib/observability/report')
  await reportError(`[${context.routeType} ${context.routePath}]`, error, {
    method: request.method,
    path: request.path.split('?')[0],
  })
}
