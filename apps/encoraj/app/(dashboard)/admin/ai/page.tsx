import Link from 'next/link'
import { notFound } from 'next/navigation'
import { css } from '@/styled-system/css'
import { getSuperAdminSession } from '@/lib/auth/super-admin'
import { getAiUsageReport } from '@/lib/ai/usage'
import { resolvePeriod } from '@/lib/reports/management'
import { addDays, fmtDate, tzParts } from '@/lib/date/tz'
import { pageHref } from '@/lib/pagination'

const QUICK_RANGES = [7, 30, 90, 365]
const OUTCOME_LABELS = {
  matched: 'Identificou o morador',
  no_match: 'Não identificou',
  invalid_response: 'Resposta inválida do modelo',
  error: 'Falha na chamada',
  disabled: 'IA desligada (sem chave)',
} as const
const OUTCOME_COLORS = {
  matched: '#16a34a',
  no_match: '#6b7280',
  invalid_response: '#d97706',
  error: '#dc2626',
  disabled: '#dc2626',
} as const

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
const labelCss = css({ fontSize: 'xs', fontWeight: 'semibold', color: 'gray.500', textTransform: 'uppercase', letterSpacing: 'wide', _dark: { color: 'gray.400' } })
const mutedCss = css({ fontSize: 'sm', color: 'gray.500', _dark: { color: 'gray.400' } })
const h2Css = css({ fontSize: 'lg', fontWeight: 'semibold', color: 'gray.900', _dark: { color: 'gray.50' } })
const thCss = css({ textAlign: 'left', px: '3', py: '2', fontSize: 'xs', fontWeight: 'semibold', color: 'gray.500', textTransform: 'uppercase', _dark: { color: 'gray.400' } })
const tdCss = css({ px: '3', py: '2', fontSize: 'sm', color: 'gray.800', borderTop: '1px solid', borderColor: 'gray.100', _dark: { color: 'gray.200', borderColor: 'gray.800' } })
const inputCss = css({ px: '3', py: '2', fontSize: 'sm', borderRadius: 'md', border: '1px solid', borderColor: 'gray.300', bg: 'white', color: 'gray.900', _dark: { bg: 'gray.900', borderColor: 'gray.600', color: 'gray.100' } })
const buttonCss = css({
  display: 'inline-flex',
  alignItems: 'center',
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
  _hover: { bg: 'gray.50' },
  _dark: { bg: 'gray.800', borderColor: 'gray.600', color: 'gray.200', _hover: { bg: 'gray.700' } },
})

const int = (value: number) => value.toLocaleString('pt-BR')
const usd = (value: number | null, digits = 2) =>
  value === null ? '—' : `US$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
const seconds = (ms: number | null) => (ms === null ? '—' : `${(ms / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s`)

/** Uso de IA (leitura de etiquetas) — de TODOS os condomínios. Só super admin. */
export default async function AdminAiPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  if (!(await getSuperAdminSession())) notFound()

  const period = resolvePeriod(await searchParams)
  const report = await getAiUsageReport(period)
  const { totals, pricing } = report
  const today = tzParts(new Date()).date
  const failures = totals.byOutcome.error + totals.byOutcome.disabled + totals.byOutcome.invalid_response
  const maxDay = Math.max(1, ...report.byDay.map((d) => d.calls))

  const kpis = [
    { label: 'Chamadas', value: int(totals.calls) },
    { label: 'Identificou o morador', value: totals.matchPct === null ? '—' : `${totals.matchPct.toLocaleString('pt-BR')}%` },
    { label: 'Falhas', value: int(failures) },
    { label: 'Tempo médio de resposta', value: seconds(totals.avgLatencyMs) },
    { label: 'Tokens de entrada', value: int(totals.promptTokens) },
    { label: 'Tokens de saída', value: int(totals.outputTokens) },
    { label: 'Custo estimado', value: usd(totals.costUsd) },
    { label: 'Custo por chamada', value: usd(totals.costPerCallUsd, 4) },
  ]

  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '6' })}>
      <div>
        <h1 className={css({ fontSize: '2xl', fontWeight: 'bold', color: 'gray.900', _dark: { color: 'gray.50' } })}>Uso de IA</h1>
        <p className={mutedCss}>
          Leitura automática de etiquetas, de todos os condomínios · {fmtDate(`${period.fromStr}T12:00:00Z`)} a{' '}
          {fmtDate(`${period.toStr}T12:00:00Z`)}
        </p>
      </div>

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
        {QUICK_RANGES.map((days) => (
          <Link key={days} href={pageHref('/admin/ai', { from: addDays(today, -(days - 1)), to: today }, 1)} className={buttonCss}>
            {days === 365 ? '12 meses' : `${days} dias`}
          </Link>
        ))}
      </form>

      {!pricing && (
        <p className={mutedCss}>
          Custo não calculado: defina <code>AI_PRICE_INPUT_USD_PER_MTOK</code> e <code>AI_PRICE_OUTPUT_USD_PER_MTOK</code> (preço em
          dólar por 1 milhão de tokens, da tabela do provedor) para ver a estimativa.
        </p>
      )}
      {report.truncated && <p className={mutedCss}>Volume acima do limite de leitura: os números deste período são parciais.</p>}

      <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: '4' })}>
        {kpis.map((kpi) => (
          <div key={kpi.label} className={css({ bg: 'white', border: '1px solid', borderColor: 'gray.200', borderRadius: 'lg', p: { base: '4', md: '5' }, _dark: { bg: 'gray.900', borderColor: 'gray.700' } })}>
            <p className={labelCss}>{kpi.label}</p>
            <p className={css({ fontSize: '2xl', fontWeight: 'bold', color: 'gray.900', mt: '1', _dark: { color: 'gray.50' } })}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {totals.calls === 0 ? (
        <p className={mutedCss}>Nenhuma chamada de IA registrada no período.</p>
      ) : (
        <>
          <section className={cardCss}>
            <div>
              <h2 className={h2Css}>Resultado das chamadas</h2>
              <p className={mutedCss}>
                “Não identificou” é normal (etiqueta ilegível ou morador não cadastrado). “Falha” e “resposta inválida” indicam
                problema com o modelo ou com a chave.
              </p>
            </div>
            <div className={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
              {(Object.keys(OUTCOME_LABELS) as Array<keyof typeof OUTCOME_LABELS>).map((outcome) => (
                <div key={outcome} className={css({ display: 'flex', alignItems: 'center', gap: '3' })}>
                  <span className={css({ w: '48', fontSize: 'sm', color: 'gray.700', _dark: { color: 'gray.300' } })}>{OUTCOME_LABELS[outcome]}</span>
                  <div className={css({ flex: 1, h: '2.5', bg: 'gray.100', borderRadius: 'full', overflow: 'hidden', _dark: { bg: 'gray.800' } })}>
                    <div style={{ width: `${Math.round((totals.byOutcome[outcome] / totals.calls) * 100)}%`, background: OUTCOME_COLORS[outcome], height: '100%' }} />
                  </div>
                  <span className={css({ w: '14', textAlign: 'right', fontSize: 'sm', fontWeight: 'semibold', color: 'gray.900', _dark: { color: 'gray.100' } })}>
                    {int(totals.byOutcome[outcome])}
                  </span>
                </div>
              ))}
            </div>
            <p className={mutedCss}>
              Maior tempo de resposta: {seconds(totals.maxLatencyMs)} · Tamanho médio da imagem:{' '}
              {totals.avgImageKb === null ? '—' : `${int(totals.avgImageKb)} KB`}
            </p>
          </section>

          <section className={cardCss}>
            <div>
              <h2 className={h2Css}>Chamadas por dia</h2>
              <p className={mutedCss}>Em vermelho, os dias com alguma falha.</p>
            </div>
            <div className={css({ display: 'flex', alignItems: 'flex-end', gap: '1px', h: '32', overflowX: 'auto' })}>
              {report.byDay.map((day) => (
                <div
                  key={day.date}
                  title={`${fmtDate(`${day.date}T12:00:00Z`)} — ${day.calls} chamada(s), ${day.failures} falha(s), ${int(day.totalTokens)} tokens`}
                  className={css({ flex: '1 0 6px', display: 'flex', alignItems: 'flex-end', h: 'full' })}
                >
                  <div style={{ height: `${(day.calls / maxDay) * 100}%`, background: day.failures ? '#dc2626' : '#2563eb', flex: 1, minHeight: day.calls ? 2 : 0 }} />
                </div>
              ))}
            </div>
          </section>

          <section className={cardCss}>
            <h2 className={h2Css}>Por condomínio</h2>
            <div className={css({ overflowX: 'auto' })}>
              <table className={css({ w: 'full', minW: '600px', borderCollapse: 'collapse' })}>
                <thead>
                  <tr>
                    <th className={thCss}>Condomínio</th>
                    <th className={thCss}>Chamadas</th>
                    <th className={thCss}>Identificou</th>
                    <th className={thCss}>Tokens</th>
                    <th className={thCss}>Custo estimado</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byCondo.map((condo) => (
                    <tr key={condo.condoId}>
                      <td className={tdCss}>{condo.name}</td>
                      <td className={tdCss}>{int(condo.calls)}</td>
                      <td className={tdCss}>{Math.round((condo.matched / condo.calls) * 100)}%</td>
                      <td className={tdCss}>{int(condo.totalTokens)}</td>
                      <td className={tdCss}>{usd(condo.costUsd, 4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={cardCss}>
            <h2 className={h2Css}>Por modelo</h2>
            <div className={css({ overflowX: 'auto' })}>
              <table className={css({ w: 'full', minW: '600px', borderCollapse: 'collapse' })}>
                <thead>
                  <tr>
                    <th className={thCss}>Modelo</th>
                    <th className={thCss}>Chamadas</th>
                    <th className={thCss}>Tokens de entrada</th>
                    <th className={thCss}>Tokens de saída</th>
                    <th className={thCss}>Custo estimado</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byModel.map((model) => (
                    <tr key={model.model}>
                      <td className={tdCss}>
                        <code>{model.model}</code>
                      </td>
                      <td className={tdCss}>{int(model.calls)}</td>
                      <td className={tdCss}>{int(model.promptTokens)}</td>
                      <td className={tdCss}>{int(model.outputTokens)}</td>
                      <td className={tdCss}>{usd(model.costUsd, 4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pricing && (
              <p className={mutedCss}>
                Preço usado: US$ {pricing.inputPerMillion.toLocaleString('pt-BR')} por milhão de tokens de entrada e US${' '}
                {pricing.outputPerMillion.toLocaleString('pt-BR')} por milhão de saída. O mesmo preço é aplicado a todos os modelos — é
                uma estimativa, não a fatura.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  )
}
