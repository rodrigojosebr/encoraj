import Link from 'next/link'
import { Eye, Package, Bell, CheckCircle2 } from 'lucide-react'
import { Badge, Button } from '@encoraj/ui'
import { css } from '@/styled-system/css'
import { fmtDate } from '@/lib/date/tz'

/** O que a lista de relatórios mostra de cada encomenda — montado no servidor. */
export interface ReportListItem {
  id: string
  code: string
  residentName: string
  /** "Bloco A · Apto 101", ou "—" se o morador não existe mais */
  unit: string
  statusName: string
  statusLabel: string
  arrivedAt: Date
  notifiedAt?: Date
  deliveredAt?: Date
}

type BadgeStatus = 'arrived' | 'notified' | 'delivered' | 'neutral'

const stepDateCss = css({ fontSize: '10px', color: 'gray.500', _dark: { color: 'gray.400' } })
const arrowCss = css({ color: 'gray.300', fontSize: 'xs', _dark: { color: 'gray.600' } })
const stepCss = {
  /** Cartão (mobile): os três passos dividem a largura */
  card: css({ display: 'flex', flexDir: 'column', alignItems: 'center', gap: '0.5', flex: '1' }),
  /** Tabela (desktop): largura mínima para a data caber */
  table: css({ display: 'flex', flexDir: 'column', alignItems: 'center', gap: '0.5', minW: '48px' }),
}

/** Chegada → Notificação → Retirada, com a data de cada passo já dado. */
function PackageTimeline({ item, layout }: { item: ReportListItem; layout: 'card' | 'table' }) {
  const notified = !!item.notifiedAt
  const delivered = !!item.deliveredAt
  return (
    <div className={css({ display: 'flex', alignItems: 'center', gap: '2' })}>
      <div className={stepCss[layout]}>
        <Package size={14} className={css({ color: 'green.500', _dark: { color: 'green.400' } })} />
        <span className={css({ fontSize: '10px', fontWeight: 'medium', color: 'green.600', _dark: { color: 'green.400' } })}>Chegada</span>
        <span className={stepDateCss}>{fmtDate(item.arrivedAt)}</span>
      </div>
      <span className={arrowCss}>──</span>
      <div className={stepCss[layout]}>
        <Bell size={14} className={css({ color: notified ? 'blue.500' : 'gray.300', _dark: { color: notified ? 'blue.400' : 'gray.600' } })} />
        <span className={css({ fontSize: '10px', fontWeight: 'medium', color: notified ? 'blue.600' : 'gray.400', _dark: { color: notified ? 'blue.400' : 'gray.600' } })}>Notif.</span>
        <span className={stepDateCss}>{item.notifiedAt ? fmtDate(item.notifiedAt) : '—'}</span>
      </div>
      <span className={arrowCss}>──</span>
      <div className={stepCss[layout]}>
        <CheckCircle2 size={14} className={css({ color: delivered ? 'green.500' : 'gray.300', _dark: { color: delivered ? 'green.400' : 'gray.600' } })} />
        <span className={css({ fontSize: '10px', fontWeight: 'medium', color: delivered ? 'green.600' : 'gray.400', _dark: { color: delivered ? 'green.400' : 'gray.600' } })}>Retirada</span>
        <span className={stepDateCss}>{item.deliveredAt ? fmtDate(item.deliveredAt) : '—'}</span>
      </div>
    </div>
  )
}

/** Cartão (mobile). */
export function ReportCard({ item }: { item: ReportListItem }) {
  return (
    <div
      className={css({
        bg: 'gray.50', border: '1px solid', borderColor: 'gray.200',
        borderRadius: 'lg', p: '4', display: 'flex', flexDir: 'column', gap: '3',
        _dark: { bg: 'gray.800', borderColor: 'gray.700' },
      })}
    >
      <div className={css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' })}>
        <span className={css({ fontSize: 'sm', fontWeight: 'bold', fontFamily: 'mono', color: 'gray.900', _dark: { color: 'gray.100' } })}>
          {item.code}
        </span>
        <Badge status={item.statusName as BadgeStatus}>{item.statusLabel}</Badge>
      </div>

      <div>
        <p className={css({ fontSize: 'sm', fontWeight: 'medium', color: 'gray.900', _dark: { color: 'gray.100' } })}>{item.residentName}</p>
        <p className={css({ fontSize: 'xs', color: 'gray.500', _dark: { color: 'gray.400' } })}>{item.unit}</p>
      </div>

      <PackageTimeline item={item} layout="card" />

      <Link href={`/packages/${item.id}`}>
        <Button variant="outline" intent="primary" size="sm" leftIcon={<Eye size={14} />} style={{ width: '100%' }}>
          Ver encomenda
        </Button>
      </Link>
    </div>
  )
}

const cellCss = css({ px: '4', py: '3', fontSize: 'sm', color: 'gray.600', _dark: { color: 'gray.400' } })

/** Linha da tabela (desktop). */
export function ReportRow({ item }: { item: ReportListItem }) {
  return (
    <tr
      className={css({
        borderBottom: '1px solid', borderColor: 'gray.100',
        _hover: { bg: 'gray.50' },
        _dark: { borderColor: 'gray.800', _hover: { bg: 'gray.800' } },
      })}
    >
      <td className={css({ px: '4', py: '3', fontSize: 'sm', fontWeight: 'medium', fontFamily: 'mono', color: 'gray.900', _dark: { color: 'gray.100' } })}>
        {item.code}
      </td>
      <td className={css({ px: '4', py: '3', fontSize: 'sm', color: 'gray.900', _dark: { color: 'gray.100' } })}>{item.residentName}</td>
      <td className={cellCss}>{item.unit}</td>
      <td className={cellCss}>{fmtDate(item.arrivedAt)}</td>
      <td className={css({ px: '4', py: '3' })}>
        <PackageTimeline item={item} layout="table" />
      </td>
      <td className={css({ px: '4', py: '3' })}>
        <Badge status={item.statusName as BadgeStatus}>{item.statusLabel}</Badge>
      </td>
      <td className={css({ px: '4', py: '3' })}>
        <Link href={`/packages/${item.id}`}>
          <Button variant="ghost" intent="primary" size="sm" leftIcon={<Eye size={14} />}>
            Ver
          </Button>
        </Link>
      </td>
    </tr>
  )
}
