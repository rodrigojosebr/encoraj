import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { ObjectId } from 'mongodb'
import Image from 'next/image'
import { packages, residents } from '@/lib/db/collections'
import { getStatus, getStatusById } from '@/lib/db/status-map'
import { css } from '@/styled-system/css'
import { Badge } from '@encoraj/ui'
import DeliverButton from './_components/DeliverButton'

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

  const [pkgStatus, delivered] = await Promise.all([
    getStatusById(pkg.status_id),
    getStatus('delivered'),
  ])
  const { name: statusName, label: statusLabel } = pkgStatus
  const isDelivered = pkg.status_id.equals(delivered._id)

  const rowCss = css({ display: 'flex', flexDir: 'column', gap: '0.5' })
  const labelCss = css({ fontSize: 'xs', fontWeight: 'semibold', color: 'gray.500', textTransform: 'uppercase', letterSpacing: 'wide', _dark: { color: 'gray.400' } })
  const valueCss = css({ fontSize: 'sm', color: 'gray.900', _dark: { color: 'gray.100' } })

  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '6', maxW: '640px' })}>
      <div className={css({ display: 'flex', alignItems: 'center', gap: '3' })}>
        <h1 className={css({ fontSize: '2xl', fontWeight: 'bold', color: 'gray.900', _dark: { color: 'gray.50' } })}>
          Encomenda
        </h1>
        <span className={css({ fontFamily: 'mono', fontSize: 'xl', fontWeight: 'bold', color: 'blue.600', _dark: { color: 'blue.400' } })}>
          {pkg.code}
        </span>
        <Badge status={statusName as 'arrived' | 'notified' | 'delivered' | 'neutral'}>{statusLabel}</Badge>
      </div>

      {/* Dados */}
      <div
        className={css({
          bg: 'white',
          border: '1px solid',
          borderColor: 'gray.200',
          borderRadius: 'lg',
          p: { base: '4', md: '6' },
          display: 'grid',
          gridTemplateColumns: { base: '1fr', md: '1fr 1fr' },
          gap: '6',
          _dark: { bg: 'gray.900', borderColor: 'gray.700' },
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

      {/* Fotos */}
      {(pkg.photo_url || pkg.qrcode_url) && (
        <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr', md: '1fr 1fr' }, gap: '4' })}>
          {pkg.photo_url && (
            <div className={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
              <span className={labelCss}>Foto da etiqueta</span>
              <div className={css({ borderRadius: 'lg', overflow: 'hidden', border: '1px solid', borderColor: 'gray.200', _dark: { borderColor: 'gray.700' } })}>
                <Image
                  src={pkg.photo_url}
                  alt="Foto da etiqueta"
                  width={400}
                  height={300}
                  className={css({ w: 'full', h: 'auto', objectFit: 'cover' })}
                />
              </div>
            </div>
          )}
          {pkg.qrcode_url && (
            <div className={css({ display: 'flex', flexDir: 'column', gap: '2', alignItems: { base: 'flex-start', md: 'center' } })}>
              <span className={labelCss}>QR Code</span>
              <div className={css({ borderRadius: 'lg', overflow: 'hidden', border: '1px solid', borderColor: 'gray.200', _dark: { borderColor: 'gray.700', filter: 'invert(1)' } })}>
                <Image
                  src={pkg.qrcode_url}
                  alt="QR Code da encomenda"
                  width={200}
                  height={200}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ação de entrega */}
      {!isDelivered && (
        <DeliverButton id={pkg._id!.toString()} />
      )}
    </div>
  )
}
