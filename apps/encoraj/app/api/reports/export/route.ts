import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { packages, residents } from '@/lib/db/collections'
import { getStatusById } from '@/lib/db/status-map'
import { getSession } from '@/lib/auth/session'
import { buildPackageFilter, EXPORT_MAX_ROWS } from '@/lib/packages/filter'
import { csvCell } from '@/lib/text/csv'
import { fmtDateTime } from '@/lib/date/tz'
import { reportError } from '@/lib/observability/report'
import { can } from '@/lib/auth/permissions'

const COLUMNS = ['Código', 'Morador', 'Apartamento', 'Status', 'Chegada', 'Notificado', 'Retirado']

/** CSV das encomendas com os mesmos filtros da tela de relatórios (todas as páginas). */
export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (!can(session, 'reports.view')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
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

    const residentIds = [...new Map(docs.map((d) => [d.resident_id.toString(), d.resident_id])).values()]
    const residentDocs = residentIds.length
      ? await (await residents())
          .find(
            { _id: { $in: residentIds }, condo_id: new ObjectId(session.condoId) },
            { projection: { name: 1, apartment: 1, bloco: 1 } },
          )
          .toArray()
      : []
    const residentById = new Map(residentDocs.map((r) => [r._id.toString(), r]))

    const lines = [COLUMNS.map(csvCell).join(';')]
    for (const pkg of docs) {
      const resident = residentById.get(pkg.resident_id.toString())
      const { label } = await getStatusById(pkg.status_id)
      lines.push(
        [
          pkg.code,
          resident?.name ?? '',
          resident ? `${resident.bloco ? `${resident.bloco}, ` : ''}Apto ${resident.apartment}` : '',
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
    await reportError('[GET /api/reports/export]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
