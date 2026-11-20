import { css } from '@/styled-system/css'
import { TOP_N, type ManagementReport } from '@/lib/reports/management'
import { mutedCss } from '@/app/(dashboard)/_lib/styles'
import { AMBER, Bar, Section, barListCss, barRowCss, barValueCss, seriesMax } from './report-ui'

/** Unidades que mais recebem (com as que têm encomenda em aberto) e total por bloco. */
export function UnitSections({ units, blocks, exportHref }: Pick<ManagementReport, 'units' | 'blocks'> & { exportHref: string }) {
  const topUnits = units.filter((u) => u.received > 0).slice(0, TOP_N)
  const maxUnit = seriesMax(topUnits.map((u) => u.received))
  const maxBlock = seriesMax(blocks.map((b) => b.received))

  return (
    <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr', md: '2fr 1fr' }, gap: '6' })}>
      <Section
        title="Unidades que mais recebem"
        hint={`As ${TOP_N} primeiras no período. O CSV traz todas.`}
        exportHref={topUnits.length ? exportHref : undefined}
      >
        {topUnits.length === 0 ? (
          <p className={mutedCss}>Sem chegadas no período.</p>
        ) : (
          <div className={barListCss}>
            {topUnits.map((unit) => (
              <div key={unit.label} className={barRowCss}>
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
        {blocks.length === 0 ? (
          <p className={mutedCss}>Sem chegadas no período.</p>
        ) : (
          <div className={barListCss}>
            {blocks.map((block) => (
              <div key={block.block} className={barRowCss}>
                <span className={css({ w: '20', fontSize: 'sm', color: 'gray.700', _dark: { color: 'gray.300' } })}>{block.block}</span>
                <Bar value={block.received} max={maxBlock} />
                <span className={barValueCss}>{block.received}</span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

/** Equipe: chegadas registradas e retiradas confirmadas por usuário. */
export function StaffSection({ staff, exportHref }: { staff: ManagementReport['staff']; exportHref: string }) {
  const maxStaff = seriesMax(staff.map((s) => Math.max(s.registered, s.delivered)))

  return (
    <Section
      title="Equipe"
      hint="Chegadas registradas (azul) e retiradas confirmadas (verde) por usuário."
      exportHref={staff.length ? exportHref : undefined}
    >
      {staff.length === 0 ? (
        <p className={mutedCss}>Sem movimento no período.</p>
      ) : (
        <div className={css({ display: 'flex', flexDir: 'column', gap: '3' })}>
          {staff.map((person, i) => (
            <div key={i} className={css({ display: 'flex', flexDir: 'column', gap: '1' })}>
              <span className={css({ fontSize: 'sm', fontWeight: 'medium', color: 'gray.800', _dark: { color: 'gray.200' } })}>{person.name}</span>
              <div className={barRowCss}>
                <Bar value={person.registered} max={maxStaff} />
                <span className={barValueCss}>{person.registered}</span>
              </div>
              <div className={barRowCss}>
                <Bar value={person.delivered} max={maxStaff} tone="green" />
                <span className={barValueCss}>{person.delivered}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}
