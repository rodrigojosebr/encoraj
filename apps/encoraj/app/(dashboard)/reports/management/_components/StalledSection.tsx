import Link from 'next/link'
import { css } from '@/styled-system/css'
import { fmtDateTime } from '@/lib/date/tz'
import { TOP_N, type ManagementReport } from '@/lib/reports/management'
import { mutedCss, tdCss, thCss } from '@/app/(dashboard)/_lib/styles'
import { Bar, Section, barListCss, barRowCss, seriesMax } from './report-ui'

/** Encomendas paradas: faixas de dias e as mais antigas. Independe do período. */
export default function StalledSection({ stalled, exportHref }: { stalled: ManagementReport['stalled']; exportHref: string }) {
  const maxBucket = seriesMax(stalled.buckets.map((b) => b.count))

  return (
    <Section
      title="Encomendas paradas"
      hint="Tudo que está na portaria agora, da mais antiga para a mais recente — independe do período."
      exportHref={stalled.rows.length ? exportHref : undefined}
    >
      {stalled.rows.length === 0 ? (
        <p className={mutedCss}>Nenhuma encomenda aguardando retirada.</p>
      ) : (
        <>
          <div className={barListCss}>
            {stalled.buckets.map((bucket, i) => (
              <div key={bucket.label} className={barRowCss}>
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
                {stalled.rows.slice(0, TOP_N).map((row) => (
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
          {stalled.rows.length > TOP_N && (
            <p className={mutedCss}>Mostrando as {TOP_N} mais antigas de {stalled.rows.length}. O CSV traz todas.</p>
          )}
        </>
      )}
    </Section>
  )
}
