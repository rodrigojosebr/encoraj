import { css } from '@/styled-system/css'
import { fmtDate } from '@/lib/date/tz'
import type { ManagementReport } from '@/lib/reports/management'
import { mutedCss } from '@/app/(dashboard)/_lib/styles'
import { Bar, CHART_BLUE, CHART_GREEN, Section, barListCss, barRowCss, barValueCss, seriesMax } from './report-ui'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

/** Volume por dia: chegadas × retiradas, uma coluna dupla por dia. */
export function DailyVolumeSection({ byDay, empty, exportHref }: { byDay: ManagementReport['byDay']; empty: boolean; exportHref: string }) {
  const maxDay = seriesMax(byDay.map((d) => Math.max(d.arrived, d.delivered)))

  return (
    <Section title="Volume por dia" hint="Chegadas (azul) e retiradas (verde)." exportHref={exportHref}>
      {empty ? (
        <p className={mutedCss}>Sem movimento no período.</p>
      ) : (
        <div className={css({ display: 'flex', alignItems: 'flex-end', gap: '1px', h: '40', overflowX: 'auto' })}>
          {byDay.map((day) => (
            <div
              key={day.date}
              title={`${fmtDate(`${day.date}T12:00:00Z`)} — ${day.arrived} chegada(s), ${day.delivered} retirada(s)`}
              className={css({ flex: '1 0 6px', display: 'flex', alignItems: 'flex-end', gap: '1px', h: 'full' })}
            >
              <div style={{ height: `${(day.arrived / maxDay) * 100}%`, background: CHART_BLUE, flex: 1, minHeight: day.arrived ? 2 : 0 }} />
              <div style={{ height: `${(day.delivered / maxDay) * 100}%`, background: CHART_GREEN, flex: 1, minHeight: day.delivered ? 2 : 0 }} />
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

/** Picos: chegadas por dia da semana e por hora — para dimensionar a portaria. */
export function PeakSections({ byWeekday, byHour, hasArrivals }: Pick<ManagementReport, 'byWeekday' | 'byHour'> & { hasArrivals: boolean }) {
  const maxWeekday = seriesMax(byWeekday)
  const maxHour = seriesMax(byHour)
  const busiestHour = byHour.indexOf(Math.max(...byHour))

  return (
    <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr', md: '1fr 1fr' }, gap: '6' })}>
      <Section title="Chegadas por dia da semana" hint="Ajuda a dimensionar a portaria.">
        <div className={barListCss}>
          {byWeekday.map((count, i) => (
            <div key={WEEKDAYS[i]} className={barRowCss}>
              <span className={css({ w: '10', fontSize: 'sm', color: 'gray.700', _dark: { color: 'gray.300' } })}>{WEEKDAYS[i]}</span>
              <Bar value={count} max={maxWeekday} />
              <span className={barValueCss}>{count}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Chegadas por hora" hint={hasArrivals ? `Pico às ${busiestHour}h.` : 'Sem chegadas no período.'}>
        <div className={css({ display: 'flex', alignItems: 'flex-end', gap: '2px', h: '32' })}>
          {byHour.map((count, hour) => (
            <div key={hour} title={`${hour}h — ${count} chegada(s)`} className={css({ flex: 1, display: 'flex', flexDir: 'column', justifyContent: 'flex-end', h: 'full' })}>
              <div style={{ height: `${(count / maxHour) * 100}%`, background: CHART_BLUE, minHeight: count ? 2 : 0 }} />
            </div>
          ))}
        </div>
        <div className={css({ display: 'flex', justifyContent: 'space-between', fontSize: 'xs', color: 'gray.500', _dark: { color: 'gray.400' } })}>
          <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
        </div>
      </Section>
    </div>
  )
}
