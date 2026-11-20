import Link from 'next/link'
import { css } from '@/styled-system/css'
import { addDays } from '@/lib/date/tz'
import { pageHref } from '@/lib/pagination'
import { labelCss } from '@/app/(dashboard)/_lib/styles'
import { buttonCss } from './report-ui'

const QUICK_RANGES = [7, 30, 90, 365]

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

/** Período do relatório: datas livres (GET) e atalhos de 7, 30, 90 dias e 12 meses. */
export default function PeriodForm({ fromStr, toStr, today }: { fromStr: string; toStr: string; today: string }) {
  return (
    <form method="GET" className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '3' })}>
      <label className={css({ display: 'flex', flexDir: 'column', gap: '1' })}>
        <span className={labelCss}>De</span>
        <input type="date" name="from" defaultValue={fromStr} max={today} className={inputCss} />
      </label>
      <label className={css({ display: 'flex', flexDir: 'column', gap: '1' })}>
        <span className={labelCss}>Até</span>
        <input type="date" name="to" defaultValue={toStr} max={today} className={inputCss} />
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
  )
}
