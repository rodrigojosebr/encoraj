import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { readSession } from '@/lib/auth/session'
import { packages } from '@/lib/db/collections'
import { formatUnit, getResidentMap } from '@/lib/residents/lookup'
import { getStatusById } from '@/lib/db/status-map'
import { css } from '@/styled-system/css'
import { Button } from '@encoraj/ui'
import { BarChart3 } from 'lucide-react'
import ExportCSV from './_components/ExportCSV'
import { ReportCard, ReportRow, type ReportListItem } from './_components/ReportItems'
import ReportsFilterBar from './_components/ReportsFilterBar'
import SearchInput from '../_components/SearchInput'
import { getTodayRange } from '@/lib/date/tz'
import { buildPackageFilter, packageStatusOptions } from '@/lib/packages/filter'
import { getPackageStats } from '@/lib/packages/stats'
import { pageHref, paginate, parsePage } from '@/lib/pagination'
import { can } from '@/lib/auth/permissions'
import Pagination from '../_components/Pagination'
import { labelCss } from '@/app/(dashboard)/_lib/styles'

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; from?: string; to?: string; q?: string; period?: string; page?: string }>
}) {
  const { status, from, to, q, period, page: pageParam } = await searchParams
  const session = await readSession()
  if (!session) redirect('/api/auth/logout')
  if (!can(session, 'reports.view')) notFound()
  const condoId = session.condoId

  const [statusOptions, stats] = await Promise.all([packageStatusOptions(), getPackageStats(condoId)])
  const todayStr = getTodayRange().today.toISOString().slice(0, 10)

  const col = await packages()

  // Listagem paginada — o export CSV (rota própria) usa os mesmos filtros, sem paginação
  const listParams = { status, period, from, to, q }
  const filter = await buildPackageFilter(condoId, listParams, { searchCode: false })
  const pagination = paginate(await col.countDocuments(filter), parsePage(pageParam))
  const docs = await col
    .find(filter)
    .sort({ arrived_at: -1 })
    .skip(pagination.skip)
    .limit(pagination.pageSize)
    .toArray()

  const residentMap = await getResidentMap(condoId, docs.map((d) => d.resident_id))
  const statusInfos = await Promise.all(docs.map((d) => getStatusById(d.status_id)))
  const items: ReportListItem[] = docs.map((pkg, i) => {
    const resident = residentMap.get(pkg.resident_id.toString())
    return {
      id: pkg._id!.toString(),
      code: pkg.code,
      residentName: resident?.name ?? '—',
      unit: resident ? formatUnit(resident) : '—',
      statusName: statusInfos[i].name,
      statusLabel: statusInfos[i].label,
      arrivedAt: pkg.arrived_at,
      notifiedAt: pkg.notified_at,
      deliveredAt: pkg.delivered_at,
    }
  })

  const exportHref = pageHref('/api/reports/export', listParams, 1)

  const statCards = [
    { label: 'Chegadas hoje',   value: stats.arrivedToday,   href: `/reports?from=${todayStr}&to=${todayStr}` },
    { label: 'Em aberto',       value: stats.open,           href: '/reports?status=open' },
    { label: 'Retiradas hoje',  value: stats.deliveredToday, href: '/reports?status=delivered&period=today' },
    { label: 'Total geral',     value: stats.total,          href: '/reports' },
  ]

  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '6' })}>
      {/* Header */}
      <div className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '3' })}>
        <h1 className={css({ fontSize: '2xl', fontWeight: 'bold', color: 'gray.900', _dark: { color: 'gray.50' } })}>
          Relatórios
        </h1>
        <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '2' })}>
          <Link href="/reports/management">
            <Button variant="outline" intent="secondary" leftIcon={<BarChart3 size={16} />}>Relatório gerencial</Button>
          </Link>
          <ExportCSV href={exportHref} />
        </div>
      </div>

      {/* Stat cards */}
      <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: '4' })}>
        {statCards.map((card) => (
          <Link key={card.label} href={card.href} className={css({ textDecoration: 'none' })}>
            <div
              className={css({
                bg: 'white', border: '1px solid', borderColor: 'gray.200',
                borderRadius: 'lg', p: { base: '4', md: '5' },
                cursor: 'pointer', transition: 'all 0.15s ease',
                _hover: { borderColor: 'blue.300', bg: 'blue.50', transform: 'translateY(-1px)', boxShadow: 'sm' },
                _dark: {
                  bg: 'gray.900', borderColor: 'gray.700',
                  _hover: { borderColor: 'blue.700', bg: 'gray.800' },
                },
              })}
            >
              <p className={css({ fontSize: 'xs', fontWeight: 'semibold', color: 'gray.500', textTransform: 'uppercase', letterSpacing: 'wide', mb: '1', _dark: { color: 'gray.400' } })}>
                {card.label}
              </p>
              <p className={css({ fontSize: '3xl', fontWeight: 'bold', color: 'gray.900', _dark: { color: 'gray.50' } })}>
                {card.value}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Busca por morador — independente, auto-search */}
      <div className={css({ display: 'flex', flexDir: 'column', gap: '1' })}>
        <span className={labelCss}>Morador</span>
        <SearchInput placeholder="Buscar por nome…" defaultValue={q ?? ''} />
      </div>

      {/* Filtros — status + datas, auto-aplicados */}
      <ReportsFilterBar
        statusOptions={statusOptions}
        status={status}
        from={from}
        to={to}
        q={q}
      />

      {/* Table */}
      <div
        className={css({
          bg: 'white', border: '1px solid', borderColor: 'gray.200',
          borderRadius: 'lg', overflow: 'hidden',
          _dark: { bg: 'gray.900', borderColor: 'gray.700' },
        })}
      >
        {items.length === 0 ? (
          <p className={css({ p: '8', textAlign: 'center', color: 'gray.500', fontSize: 'sm', _dark: { color: 'gray.400' } })}>
            Nenhuma encomenda encontrada.
          </p>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className={css({ display: { base: 'flex', md: 'none' }, flexDir: 'column', gap: '3', p: '3' })}>
              {items.map((item) => <ReportCard key={item.id} item={item} />)}
            </div>

            {/* Desktop: tabela */}
            <div className={css({ display: { base: 'none', md: 'block' }, overflowX: 'auto' })}>
              <table className={css({ w: 'full', minW: '720px', borderCollapse: 'collapse' })}>
                <thead>
                  <tr className={css({ bg: 'gray.50', borderBottom: '1px solid', borderColor: 'gray.200', _dark: { bg: 'gray.800', borderColor: 'gray.700' } })}>
                    {['Código', 'Morador', 'Unidade', 'Chegada', 'Timeline', 'Status', ''].map((h) => (
                      <th
                        key={h}
                        className={css({
                          px: '4', py: '3', textAlign: 'left', fontSize: 'xs',
                          fontWeight: 'semibold', color: 'gray.500',
                          textTransform: 'uppercase', letterSpacing: 'wide',
                          _dark: { color: 'gray.400' },
                        })}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => <ReportRow key={item.id} item={item} />)}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <Pagination pathname="/reports" params={listParams} pagination={pagination} />
    </div>
  )
}
