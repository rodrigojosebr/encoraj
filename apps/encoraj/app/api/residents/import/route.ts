import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { can } from '@/lib/auth/permissions'
import { badRequest, forbidden, serverError, unauthorized } from '@/lib/api/http'
import { formatUnit } from '@/lib/residents/lookup'
import { MAX_SHEET_BYTES, readResidentSheet } from '@/lib/residents/sheet'
import { importResidents, planResidentImport } from '@/lib/residents/import'

/** Quantas linhas de cada lista vão na resposta. O total vai sempre, em `*_count`. */
const LIST_LIMIT = 100
/** Primeiros moradores que entram, para a pessoa conferir se as colunas estão no lugar. */
const SAMPLE_SIZE = 5

/**
 * Importação de moradores por planilha (CSV), em dois passos com o mesmo arquivo:
 *   mode=check (padrão) → só confere: quem entra, quem já existe, erros por linha. Não grava.
 *   mode=import → grava. Planilha com qualquer erro é recusada inteira.
 * O arquivo não é guardado: cada passo lê e valida tudo de novo.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return unauthorized()
    if (!can(session, 'residents.import')) {
      return forbidden()
    }

    // corpo que não é multipart: erro de quem chamou (400), não do servidor
    const form = await request.formData().catch(() => null)
    const file = form?.get('file')
    if (!form || !(file instanceof Blob)) return badRequest('Arquivo não enviado.')
    if (file.size > MAX_SHEET_BYTES) return badRequest('Arquivo muito grande (máx. 1 MB).')

    const sheet = readResidentSheet(new Uint8Array(await file.arrayBuffer()))
    if ('error' in sheet) return badRequest(sheet.error)

    if (form.get('mode') === 'import') {
      if (sheet.problems.length > 0) {
        return badRequest('A planilha tem erros. Envie de novo para conferir antes de importar.')
      }
      const result = await importResidents(session.condoId, { id: session.userId, name: session.userName }, sheet.rows)
      return NextResponse.json(result)
    }

    const plan = await planResidentImport(session.condoId, sheet.rows)
    return NextResponse.json({
      to_create: plan.toCreate.length,
      sample: plan.toCreate
        .slice(0, SAMPLE_SIZE)
        .map((row) => ({ line: row.line, name: row.name, unit: formatUnit(row), whatsapp: row.whatsapp })),
      skipped_count: plan.skipped.length,
      skipped: plan.skipped.slice(0, LIST_LIMIT),
      error_count: sheet.problems.length,
      errors: sheet.problems.slice(0, LIST_LIMIT),
    })
  } catch (err) {
    return serverError('[POST /api/residents/import]', err)
  }
}
