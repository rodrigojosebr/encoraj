import { getSession } from '@/lib/auth/session'
import { can } from '@/lib/auth/permissions'
import { forbidden, serverError, unauthorized } from '@/lib/api/http'
import { csvResponse } from '@/lib/text/csv'
import { residentSheetTemplate } from '@/lib/residents/sheet'

/** Modelo da planilha de moradores: os títulos das colunas, prontos para preencher. */
export async function GET() {
  try {
    const session = await getSession()
    if (!session) return unauthorized()
    if (!can(session, 'residents.import')) {
      return forbidden()
    }

    return csvResponse('modelo-moradores.csv', residentSheetTemplate())
  } catch (err) {
    return serverError('[GET /api/residents/import/template]', err)
  }
}
