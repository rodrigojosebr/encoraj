import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { css } from '@/styled-system/css'
import { readSession } from '@/lib/auth/session'
import { fmtDate, tzParts } from '@/lib/date/tz'
import { pageHref } from '@/lib/pagination'
import { can } from '@/lib/auth/permissions'
import { getManagementReport, resolvePeriod } from '@/lib/reports/management'
import { labelCss, mutedCss } from '@/app/(dashboard)/_lib/styles'
import { AMBER } from './_components/report-ui'
import PeriodForm from './_components/PeriodForm'
import StalledSection from './_components/StalledSection'
import { DailyVolumeSection, PeakSections } from './_components/ActivitySections'
import { StaffSection, UnitSections } from './_components/PeopleSections'

const hours = (value: number | null) => {
  if (value === null) return '—'
  return value >= 48 ? `${(value / 24).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dias` : `${value.toLocaleString('pt-BR')} h`
}
const pct = (value: number | null) => (value === null ? '—' : `${value.toLocaleString('pt-BR')}%`)

export default async function ManagementReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const session = await readSession()
  if (!session) redirect('/api/auth/logout')
  if (!can(session, 'reports.view')) notFound()

  const period = resolvePeriod(await searchParams)
  const report = await getManagementReport(session.condoId, period)
  const { summary } = report
  const today = tzParts(new Date()).date

  const exportHref = (section: string) =>
    pageHref('/api/reports/management/export', { section, from: period.fromStr, to: period.toStr }, 1)

  const kpis = [
    { label: 'Chegadas no período', value: summary.arrived.toLocaleString('pt-BR') },
    { label: 'Retiradas no período', value: summary.delivered.toLocaleString('pt-BR') },
    { label: 'Em aberto agora', value: summary.openNow.toLocaleString('pt-BR') },
    { label: 'Tempo médio até a retirada', value: hours(summary.avgPickupHours) },
    { label: 'Tempo mediano até a retirada', value: hours(summary.medianPickupHours) },
    { label: 'Retiradas em até 24h', value: pct(summary.within24hPct) },
    { label: 'Moradores avisados', value: pct(summary.notifiedPct) },
    { label: 'Tempo médio até o aviso', value: summary.avgNotifyMinutes === null ? '—' : `${summary.avgNotifyMinutes.toLocaleString('pt-BR')} min` },
  ]

  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '6' })}>
      {/* Header */}
      <div>
        <Link href="/reports" className={css({ fontSize: 'sm', color: 'blue.600', textDecoration: 'none', _hover: { textDecoration: 'underline' }, _dark: { color: 'blue.400' } })}>
          ← Relatórios
        </Link>
        <h1 className={css({ fontSize: '2xl', fontWeight: 'bold', color: 'gray.900', mt: '2', _dark: { color: 'gray.50' } })}>
          Relatório gerencial
        </h1>
        <p className={mutedCss}>
          {fmtDate(`${period.fromStr}T12:00:00Z`)} a {fmtDate(`${period.toStr}T12:00:00Z`)} · {period.days} dia{period.days === 1 ? '' : 's'}
        </p>
      </div>

      <PeriodForm fromStr={period.fromStr} toStr={period.toStr} today={today} />

      {report.truncated && (
        <p className={css({ fontSize: 'sm' })} style={{ color: AMBER }}>
          Volume acima do limite de leitura: os números deste período são parciais. Use um período menor.
        </p>
      )}

      {/* Indicadores */}
      <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: '4' })}>
        {kpis.map((kpi) => (
          <div key={kpi.label} className={css({ bg: 'white', border: '1px solid', borderColor: 'gray.200', borderRadius: 'lg', p: { base: '4', md: '5' }, _dark: { bg: 'gray.900', borderColor: 'gray.700' } })}>
            <p className={labelCss}>{kpi.label}</p>
            <p className={css({ fontSize: '2xl', fontWeight: 'bold', color: 'gray.900', mt: '1', _dark: { color: 'gray.50' } })}>{kpi.value}</p>
          </div>
        ))}
      </div>
      {summary.deliveredWithoutNotice > 0 && (
        <p className={mutedCss}>
          {summary.deliveredWithoutNotice.toLocaleString('pt-BR')} encomenda{summary.deliveredWithoutNotice === 1 ? ' foi retirada' : 's foram retiradas'} sem
          aviso registrado ao morador.
        </p>
      )}

      <StalledSection stalled={report.stalled} exportHref={exportHref('stalled')} />
      <DailyVolumeSection byDay={report.byDay} empty={summary.arrived + summary.delivered === 0} exportHref={exportHref('daily')} />
      <PeakSections byWeekday={report.byWeekday} byHour={report.byHour} hasArrivals={summary.arrived > 0} />
      <UnitSections units={report.units} blocks={report.blocks} exportHref={exportHref('units')} />
      <StaffSection staff={report.staff} exportHref={exportHref('staff')} />
    </div>
  )
}
