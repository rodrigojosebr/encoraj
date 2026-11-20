import { getSession } from '@/lib/auth/session'
import { getManagementReport, resolvePeriod, type ManagementReport } from '@/lib/reports/management'
import { csvDocument, csvResponse } from '@/lib/text/csv'
import { fmtDate, fmtDateTime } from '@/lib/date/tz'
import { can } from '@/lib/auth/permissions'
import { badRequest, forbidden, serverError, unauthorized } from '@/lib/api/http'

type Table = { columns: string[]; rows: Array<Array<string | number>> }

/** Cada seção do relatório gerencial vira uma planilha */
const SECTIONS: Record<string, (report: ManagementReport) => Table> = {
  daily: (r) => ({
    columns: ['Data', 'Chegadas', 'Retiradas'],
    rows: r.byDay.map((d) => [fmtDate(`${d.date}T12:00:00Z`), d.arrived, d.delivered]),
  }),
  units: (r) => ({
    columns: ['Unidade', 'Bloco', 'Recebidas no período', 'Em aberto agora'],
    rows: r.units.map((u) => [u.label, u.block, u.received, u.open]),
  }),
  staff: (r) => ({
    columns: ['Usuário', 'Chegadas registradas', 'Retiradas confirmadas'],
    rows: r.staff.map((s) => [s.name, s.registered, s.delivered]),
  }),
  stalled: (r) => ({
    columns: ['Código', 'Morador', 'Unidade', 'Chegada', 'Dias parada'],
    rows: r.stalled.rows.map((s) => [s.code, s.resident, s.unit, fmtDateTime(s.arrivedAt), s.days]),
  }),
}

/** CSV de uma seção do relatório gerencial: ?section=daily|units|staff|stalled&from=&to= */
export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) return unauthorized()
    if (!can(session, 'reports.view')) {
      return forbidden()
    }

    const sp = new URL(request.url).searchParams
    const section = sp.get('section') ?? ''
    if (!Object.hasOwn(SECTIONS, section)) {
      return badRequest(`Seção inválida. Use: ${Object.keys(SECTIONS).join(', ')}.`)
    }

    const period = resolvePeriod({ from: sp.get('from') ?? undefined, to: sp.get('to') ?? undefined })
    const { columns, rows } = SECTIONS[section](await getManagementReport(session.condoId, period))

    return csvResponse(`gerencial-${section}-${period.fromStr}-a-${period.toStr}.csv`, csvDocument(columns, rows))
  } catch (err) {
    return serverError('[GET /api/reports/management/export]', err)
  }
}
