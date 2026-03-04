import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { ObjectId } from 'mongodb'
import { packages, residents } from '@/lib/db/collections'
import { getStatusName, getStatusId } from '@/lib/db/status-map'
import { css } from '@/styled-system/css'
import { Badge } from '@encoraj/ui'
import DeliverButton from './_components/DeliverButton'

const STATUS_LABEL: Record<string, string> = {
  arrived:   'Chegou',
  notified:  'Notificado',
  delivered: 'Retirado',
}

interface RouteContext {
  params: Promise<{ id: string }>
}

export default async function PackageDetailPage({ params }: RouteContext) {
  const { id } = await params
  const headersList = await headers()
  const condoId = headersList.get('x-condo-id')!

  if (!ObjectId.isValid(id)) notFound()

  const col = await packages()
  const pkg = await col.findOne({ _id: new ObjectId(id), condo_id: new ObjectId(condoId) })

  if (!pkg) notFound()

  const resCol = await residents()
  const resident = await resCol.findOne({ _id: pkg.resident_id })

  const statusName = await getStatusName(pkg.status_id)
  const deliveredStatusId = await getStatusId('delivered')
  const isDelivered = pkg.status_id.equals(deliveredStatusId)

  const rowCss = css({ display: 'flex', flexDir: 'column', gap: '0.5' })
  const labelCss = css({ fontSize: 'xs', fontWeight: 'semibold', color: 'gray.500', textTransform: 'uppercase', letterSpacing: 'wide' })
  const valueCss = css({ fontSize: 'sm', color: 'gray.900' })

  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '6', maxW: '640px' })}>
      <div className={css({ display: 'flex', alignItems: 'center', gap: '3' })}>
        <h1 className={css({ fontSize: '2xl', fontWeight: 'bold', color: 'gray.900' })}>
          Encomenda
        </h1>
        <span className={css({ fontFamily: 'mono', fontSize: 'xl', fontWeight: 'bold', color: 'blue.600' })}>
          {pkg.code}
        </span>
        <Badge status={statusName as 'arrived' | 'notified' | 'delivered' | 'neutral'}>{STATUS_LABEL[statusName] ?? statusName}</Badge>
      </div>

      {/* Dados */}
      <div
        className={css({
          bg: 'white',
          border: '1px solid',
          borderColor: 'gray.200',
          borderRadius: 'lg',
          p: '6',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6',
        })}
      >
        <div className={rowCss}>
          <span className={labelCss}>Morador</span>
          <span className={valueCss}>{resident?.name ?? '—'}</span>
        </div>
        <div className={rowCss}>
          <span className={labelCss}>Apartamento</span>
          <span className={valueCss}>{resident?.apartment ?? '—'}</span>
        </div>
        <div className={rowCss}>
          <span className={labelCss}>Chegada</span>
          <span className={valueCss}>
            {new Date(pkg.arrived_at).toLocaleString('pt-BR')}
          </span>
        </div>
        {pkg.notified_at && (
          <div className={rowCss}>
            <span className={labelCss}>Notificado em</span>
            <span className={valueCss}>
              {new Date(pkg.notified_at).toLocaleString('pt-BR')}
            </span>
          </div>
        )}
        {pkg.delivered_at && (
          <div className={rowCss}>
            <span className={labelCss}>Retirado em</span>
            <span className={valueCss}>
              {new Date(pkg.delivered_at).toLocaleString('pt-BR')}
            </span>
          </div>
        )}
        {pkg.notes && (
          <div className={css({ ...{ display: 'flex', flexDir: 'column', gap: '0.5' }, gridColumn: '1 / -1' })}>
            <span className={labelCss}>Observações</span>
            <span className={valueCss}>{pkg.notes}</span>
          </div>
        )}
      </div>

      {/* Ação de entrega */}
      {!isDelivered && (
        <DeliverButton id={pkg._id!.toString()} />
      )}
    </div>
  )
}
