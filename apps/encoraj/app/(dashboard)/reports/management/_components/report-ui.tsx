import { Download } from 'lucide-react'
import { css } from '@/styled-system/css'
import { cardCss, mutedCss } from '@/app/(dashboard)/_lib/styles'

// Cores fixas dos gráficos: o tema do projeto não define a escala âmbar
export const CHART_BLUE = '#2563eb'
export const CHART_GREEN = '#16a34a'
export const AMBER = '#d97706'

export const buttonCss = css({
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

/** Linha de barras: rótulo, barra e número lado a lado. */
export const barRowCss = css({ display: 'flex', alignItems: 'center', gap: '3' })
export const barListCss = css({ display: 'flex', flexDir: 'column', gap: '2' })
export const barValueCss = css({ w: '10', textAlign: 'right', fontSize: 'sm', color: 'gray.900', _dark: { color: 'gray.100' } })

/** Barra horizontal proporcional ao maior valor da série */
export function Bar({ value, max, tone = 'blue' }: { value: number; max: number; tone?: 'blue' | 'green' | 'amber' }) {
  const color = { blue: CHART_BLUE, green: CHART_GREEN, amber: AMBER }[tone]
  return (
    <div className={css({ flex: 1, h: '2.5', bg: 'gray.100', borderRadius: 'full', overflow: 'hidden', _dark: { bg: 'gray.800' } })}>
      <div style={{ width: `${max ? Math.round((value / max) * 100) : 0}%`, background: color, height: '100%' }} />
    </div>
  )
}

/** Cartão de uma seção do relatório, com o botão de CSV quando houver export. */
export function Section({ title, hint, exportHref, children }: { title: string; hint?: string; exportHref?: string; children: React.ReactNode }) {
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

/** Maior valor da série, nunca zero (é divisor da largura das barras). */
export const seriesMax = (values: number[]) => Math.max(1, ...values)
