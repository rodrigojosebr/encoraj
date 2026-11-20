import { NextResponse } from 'next/server'
import { packages } from '@/lib/db/collections'
import { formatUnit, getResidentMap } from '@/lib/residents/lookup'
import { getStatusById } from '@/lib/db/status-map'
import { getSession } from '@/lib/auth/session'
import { buildPackageFilter, EXPORT_MAX_ROWS } from '@/lib/packages/filter'
import { csvCell } from '@/lib/text/csv'
import { fmtDateTime } from '@/lib/date/tz'
import { can } from '@/lib/auth/permissions'
import { forbidden, serverError, unauthorized } from '@/lib/api/http'

const COLUMNS = ['Código', 'Morador', 'Unidade', 'Status', 'Chegada', 'Notificado', 'Retirado']

/** CSV das encomendas com os mesmos filtros da tela de relatórios (todas as páginas). */
export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) return unauthorized()
    if (!can(session, 'reports.view')) {
      return forbidden()
    }

    const sp = new URL(request.url).searchParams
    const filter = await buildPackageFilter(
      session.condoId,
      {
        status: sp.get('status') ?? undefined,
        period: sp.get('period') ?? undefined,
        from: sp.get('from') ?? undefined,
        to: sp.get('to') ?? undefined,
        q: sp.get('q') ?? undefined,
      },
      { searchCode: false },
    )

    const docs = await (await packages())
      .find(filter, {
        projection: { code: 1, resident_id: 1, status_id: 1, arrived_at: 1, notified_at: 1, delivered_at: 1 },
      })
      .sort({ arrived_at: -1 })
      .limit(EXPORT_MAX_ROWS)
      .toArray()

    const residentById = await getResidentMap(session.condoId, docs.map((d) => d.resident_id))

    const lines = [COLUMNS.map(csvCell).join(';')]
    for (const pkg of docs) {
      const resident = residentById.get(pkg.resident_id.toString())
      const { label } = await getStatusById(pkg.status_id)
      lines.push(
        [
          pkg.code,
          resident?.name ?? '',
          resident ? formatUnit(resident) : '',
          label,
          fmtDateTime(pkg.arrived_at),
          pkg.notified_at ? fmtDateTime(pkg.notified_at) : '',
          pkg.delivered_at ? fmtDateTime(pkg.delivered_at) : '',
        ]
          .map(csvCell)
          .join(';'),
      )
    }

    // BOM para o Excel reconhecer UTF-8
    return new NextResponse(`﻿${lines.join('\n')}`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="encomendas-${new Date().toISOString().slice(0, 10)}.csv"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    return serverError('[GET /api/reports/export]', err)
  }
}
