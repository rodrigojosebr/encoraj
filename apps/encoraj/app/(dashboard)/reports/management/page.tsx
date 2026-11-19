import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Download } from 'lucide-react'
import { css } from '@/styled-system/css'
import { readSession } from '@/lib/auth/session'
import { addDays, fmtDate, fmtDateTime, tzParts } from '@/lib/date/tz'
import { pageHref } from '@/lib/pagination'
import { can } from '@/lib/auth/permissions'
import { getManagementReport, resolvePeriod, TOP_N } from '@/lib/reports/management'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const QUICK_RANGES = [7, 30, 90, 365]
// Cor fixa: o tema do projeto não define a escala âmbar
const AMBER = '#d97706'

const cardCss = css({
  bg: 'white',
  border: '1px solid',
  borderColor: 'gray.200',
  borderRadius: 'lg',
  p: { base: '4', md: '6' },
  display: 'flex',
  flexDir: 'column',
  gap: '4',
  _dark: { bg: 'gray.900', borderColor: 'gray.700' },
})
const labelCss = css({
  fontSize: 'xs',
  fontWeight: 'semibold',
  color: 'gray.500',
  textTransform: 'uppercase',
  letterSpacing: 'wide',
  _dark: { color: 'gray.400' },
})
const mutedCss = css({ fontSize: 'sm', color: 'gray.500', _dark: { color: 'gray.400' } })
const thCss = css({ textAlign: 'left', px: '3', py: '2', fontSize: 'xs', fontWeight: 'semibold', color: 'gray.500', textTransform: 'uppercase', _dark: { color: 'gray.400' } })
const tdCss = css({ px: '3', py: '2', fontSize: 'sm', color: 'gray.800', borderTop: '1px solid', borderColor: 'gray.100', _dark: { color: 'gray.200', borderColor: 'gray.800' } })
const inputCss = css({
  px: '3',
  py: '2',
  fontSize: 'sm',
  borderRadius: 'md',
  border: '1px solid',
  borderColor: 'gray.300',
  bg: 'white',
  color: 'gray.900',
  _dark: { bg: 'gray.900', borderColor: 'gray.600', color: 'gray.100' },
})
const buttonCss = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '1.5',
  px: '3',
  py: '2',
  fontSize: 'sm',
  fontWeight: 'medium',
  borderRadius: 'md',
  border: '1px solid',
  borderColor: 'gray.300',
  bg: 'white',
  color: 'gray.700',
  cursor: 'pointer',
  textDecoration: 'none',
  _hover: { bg: 'gray.50', borderColor: 'gray.400' },
  _dark: { bg: 'gray.800', borderColor: 'gray.600', color: 'gray.200', _hover: { bg: 'gray.700' } },
})

const hours = (value: number | null) => {
  if (value === null) return '—'
  return value >= 48 ? `${(value / 24).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dias` : `${value.toLocaleString('pt-BR')} h`
}
const pct = (value: number | null) => (value === null ? '—' : `${value.toLocaleString('pt-BR')}%`)

/** Barra horizontal proporcional ao maior valor da série */
function Bar({ value, max, tone = 'blue' }: { value: number; max: number; tone?: 'blue' | 'green' | 'amber' }) {
  const color = { blue: '#2563eb', green: '#16a34a', amber: AMBER }[tone]
  return (
    <div className={css({ flex: 1, h: '2.5', bg: 'gray.100', borderRadius: 'full', overflow: 'hidden', _dark: { bg: 'gray.800' } })}>
      <div style={{ width: `${max ? Math.round((value / max) * 100) : 0}%`, background: color, height: '100%' }} />
    </div>
  )
}

function Section({ title, hint, exportHref, children }: { title: string; hint?: string; exportHref?: string; children: React.ReactNode }) {
  return (
    <section className={cardCss}>
      <div className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '3' })}>
        <div>
          <h2 className={css({ fontSize: 'lg', fontWeight: 'semibold', color: 'gray.900', _dark: { color: 'gray.50' } })}>{title}</h2>
          {hint && <p className={mutedCss}>{hint}</p>}
        </div>
        {exportHref && (
          <a href={exportHref} download className={buttonCss}>
            <Download size={14} /> CSV
          </a>
        )}
      </div>
      {children}
    </section>
  )
}

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

  const maxDay = Math.max(1, ...report.byDay.map((d) => Math.max(d.arrived, d.delivered)))
  const maxWeekday = Math.max(1, ...report.byWeekday)
  const maxHour = Math.max(1, ...report.byHour)
  const topUnits = report.units.filter((u) => u.received > 0).slice(0, TOP_N)
  const maxUnit = Math.max(1, ...topUnits.map((u) => u.received))
  const maxBlock = Math.max(1, ...report.blocks.map((b) => b.received))
  const maxStaff = Math.max(1, ...report.staff.map((s) => Math.max(s.registered, s.delivered)))
  const maxBucket = Math.max(1, ...report.stalled.buckets.map((b) => b.count))
  const busiestHour = report.byHour.indexOf(Math.max(...report.byHour))

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

      {/* Período */}
      <form method="GET" className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '3' })}>
        <label className={css({ display: 'flex', flexDir: 'column', gap: '1' })}>
          <span className={labelCss}>De</span>
          <input type="date" name="from" defaultValue={period.fromStr} max={today} className={inputCss} />
        </label>
        <label className={css({ display: 'flex', flexDir: 'column', gap: '1' })}>
          <span className={labelCss}>Até</span>
          <input type="date" name="to" defaultValue={period.toStr} max={today} className={inputCss} />
        </label>
        <button type="submit" className={buttonCss}>Aplicar</button>
        <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '2' })}>
          {QUICK_RANGES.map((days) => (
            <Link
              key={days}
              href={pageHref('/reports/management', { from: addDays(today, -(days - 1)), to: today }, 1)}
              className={buttonCss}
            >
              {days === 365 ? '12 meses' : `${days} dias`}
            </Link>
          ))}
        </div>
      </form>

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

      {/* Encomendas paradas */}
      <Section
        title="Encomendas paradas"
        hint="Tudo que está na portaria agora, da mais antiga para a mais recente — independe do período."
        exportHref={report.stalled.rows.length ? exportHref('stalled') : undefined}
      >
        {report.stalled.rows.length === 0 ? (
          <p className={mutedCss}>Nenhuma encomenda aguardando retirada.</p>
        ) : (
          <>
            <div className={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
              {report.stalled.buckets.map((bucket, i) => (
                <div key={bucket.label} className={css({ display: 'flex', alignItems: 'center', gap: '3' })}>
                  <span className={css({ w: '32', fontSize: 'sm', color: 'gray.700', _dark: { color: 'gray.300' } })}>{bucket.label}</span>
                  <Bar value={bucket.count} max={maxBucket} tone={i >= 2 ? 'amber' : 'blue'} />
                  <span className={css({ w: '10', textAlign: 'right', fontSize: 'sm', fontWeight: 'semibold', color: 'gray.900', _dark: { color: 'gray.100' } })}>{bucket.count}</span>
                </div>
              ))}
            </div>
            <div className={css({ overflowX: 'auto' })}>
              <table className={css({ w: 'full', minW: '600px', borderCollapse: 'collapse' })}>
                <thead>
                  <tr>
                    <th className={thCss}>Código</th>
                    <th className={thCss}>Morador</th>
                    <th className={thCss}>Unidade</th>
                    <th className={thCss}>Chegada</th>
                    <th className={thCss}>Dias</th>
                  </tr>
                </thead>
                <tbody>
                  {report.stalled.rows.slice(0, TOP_N).map((row) => (
                    <tr key={row.id}>
                      <td className={tdCss}>
                        <Link href={`/packages/${row.id}`} className={css({ fontFamily: 'mono', color: 'blue.600', textDecoration: 'none', _hover: { textDecoration: 'underline' }, _dark: { color: 'blue.400' } })}>
                          {row.code}
                        </Link>
                      </td>
                      <td className={tdCss}>{row.resident}</td>
                      <td className={tdCss}>{row.unit}</td>
                      <td className={tdCss}>{fmtDateTime(row.arrivedAt)}</td>
                      <td className={tdCss}>{row.days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {report.stalled.rows.length > TOP_N && (
              <p className={mutedCss}>Mostrando as {TOP_N} mais antigas de {report.stalled.rows.length}. O CSV traz todas.</p>
            )}
          </>
        )}
      </Section>

      {/* Volume por dia */}
      <Section title="Volume por dia" hint="Chegadas (azul) e retiradas (verde)." exportHref={exportHref('daily')}>
        {summary.arrived + summary.delivered === 0 ? (
          <p className={mutedCss}>Sem movimento no período.</p>
        ) : (
          <div className={css({ display: 'flex', alignItems: 'flex-end', gap: '1px', h: '40', overflowX: 'auto' })}>
            {report.byDay.map((day) => (
              <div
                key={day.date}
                title={`${fmtDate(`${day.date}T12:00:00Z`)} — ${day.arrived} chegada(s), ${day.delivered} retirada(s)`}
                className={css({ flex: '1 0 6px', display: 'flex', alignItems: 'flex-end', gap: '1px', h: 'full' })}
              >
                <div style={{ height: `${(day.arrived / maxDay) * 100}%`, background: '#2563eb', flex: 1, minHeight: day.arrived ? 2 : 0 }} />
                <div style={{ height: `${(day.delivered / maxDay) * 100}%`, background: '#16a34a', flex: 1, minHeight: day.delivered ? 2 : 0 }} />
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Picos */}
      <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr', md: '1fr 1fr' }, gap: '6' })}>
        <Section title="Chegadas por dia da semana" hint="Ajuda a dimensionar a portaria.">
          <div className={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
            {report.byWeekday.map((count, i) => (
              <div key={WEEKDAYS[i]} className={css({ display: 'flex', alignItems: 'center', gap: '3' })}>
                <span className={css({ w: '10', fontSize: 'sm', color: 'gray.700', _dark: { color: 'gray.300' } })}>{WEEKDAYS[i]}</span>
                <Bar value={count} max={maxWeekday} />
                <span className={css({ w: '10', textAlign: 'right', fontSize: 'sm', color: 'gray.900', _dark: { color: 'gray.100' } })}>{count}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Chegadas por hora"
          hint={summary.arrived ? `Pico às ${busiestHour}h.` : 'Sem chegadas no período.'}
        >
          <div className={css({ display: 'flex', alignItems: 'flex-end', gap: '2px', h: '32' })}>
            {report.byHour.map((count, hour) => (
              <div key={hour} title={`${hour}h — ${count} chegada(s)`} className={css({ flex: 1, display: 'flex', flexDir: 'column', justifyContent: 'flex-end', h: 'full' })}>
                <div style={{ height: `${(count / maxHour) * 100}%`, background: '#2563eb', minHeight: count ? 2 : 0 }} />
              </div>
            ))}
          </div>
          <div className={css({ display: 'flex', justifyContent: 'space-between', fontSize: 'xs', color: 'gray.500', _dark: { color: 'gray.400' } })}>
            <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
          </div>
        </Section>
      </div>

      {/* Unidades e blocos */}
      <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr', md: '2fr 1fr' }, gap: '6' })}>
        <Section
          title="Unidades que mais recebem"
          hint={`As ${TOP_N} primeiras no período. O CSV traz todas.`}
          exportHref={topUnits.length ? exportHref('units') : undefined}
        >
          {topUnits.length === 0 ? (
            <p className={mutedCss}>Sem chegadas no período.</p>
          ) : (
            <div className={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
              {topUnits.map((unit) => (
                <div key={unit.label} className={css({ display: 'flex', alignItems: 'center', gap: '3' })}>
                  <span className={css({ w: '40', fontSize: 'sm', color: 'gray.700', _dark: { color: 'gray.300' } })}>{unit.label}</span>
                  <Bar value={unit.received} max={maxUnit} />
                  <span className={css({ w: '24', textAlign: 'right', fontSize: 'sm', color: 'gray.900', _dark: { color: 'gray.100' } })}>
                    {unit.received}
                    {unit.open > 0 && <span style={{ color: AMBER }}> · {unit.open} aberta{unit.open === 1 ? '' : 's'}</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Por bloco">
          {report.blocks.length === 0 ? (
            <p className={mutedCss}>Sem chegadas no período.</p>
          ) : (
            <div className={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
              {report.blocks.map((block) => (
                <div key={block.block} className={css({ display: 'flex', alignItems: 'center', gap: '3' })}>
                  <span className={css({ w: '20', fontSize: 'sm', color: 'gray.700', _dark: { color: 'gray.300' } })}>{block.block}</span>
                  <Bar value={block.received} max={maxBlock} />
                  <span className={css({ w: '10', textAlign: 'right', fontSize: 'sm', color: 'gray.900', _dark: { color: 'gray.100' } })}>{block.received}</span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Equipe */}
      <Section
        title="Equipe"
        hint="Chegadas registradas (azul) e retiradas confirmadas (verde) por usuário."
        exportHref={report.staff.length ? exportHref('staff') : undefined}
      >
        {report.staff.length === 0 ? (
          <p className={mutedCss}>Sem movimento no período.</p>
        ) : (
          <div className={css({ display: 'flex', flexDir: 'column', gap: '3' })}>
            {report.staff.map((person, i) => (
              <div key={i} className={css({ display: 'flex', flexDir: 'column', gap: '1' })}>
                <span className={css({ fontSize: 'sm', fontWeight: 'medium', color: 'gray.800', _dark: { color: 'gray.200' } })}>{person.name}</span>
                <div className={css({ display: 'flex', alignItems: 'center', gap: '3' })}>
                  <Bar value={person.registered} max={maxStaff} />
                  <span className={css({ w: '10', textAlign: 'right', fontSize: 'sm', color: 'gray.900', _dark: { color: 'gray.100' } })}>{person.registered}</span>
                </div>
                <div className={css({ display: 'flex', alignItems: 'center', gap: '3' })}>
                  <Bar value={person.delivered} max={maxStaff} tone="green" />
                  <span className={css({ w: '10', textAlign: 'right', fontSize: 'sm', color: 'gray.900', _dark: { color: 'gray.100' } })}>{person.delivered}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}
