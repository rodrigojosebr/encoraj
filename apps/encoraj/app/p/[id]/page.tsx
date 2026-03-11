import { notFound } from 'next/navigation'
import { ObjectId } from 'mongodb'
import Image from 'next/image'
import { packages, residents, condominiums } from '@/lib/db/collections'
import { getStatusById, getStatus } from '@/lib/db/status-map'
import { css } from '@/styled-system/css'

interface RouteContext {
  params: Promise<{ id: string }>
}

export default async function PublicPackagePage({ params }: RouteContext) {
  const { id } = await params

  if (!ObjectId.isValid(id)) notFound()

  const col = await packages()
  const pkg = await col.findOne({ _id: new ObjectId(id) })
  if (!pkg) notFound()

  const [resident, condo, pkgStatus, delivered] = await Promise.all([
    residents().then(c => c.findOne({ _id: pkg.resident_id })),
    condominiums().then(c => c.findOne({ _id: pkg.condo_id })),
    getStatusById(pkg.status_id),
    getStatus('delivered'),
  ])

  const isDelivered = pkg.status_id.equals(delivered._id)

  const badgeColor = {
    arrived: { bg: '#dbeafe', text: '#1d4ed8' },
    notified: { bg: '#fef9c3', text: '#854d0e' },
    delivered: { bg: '#dcfce7', text: '#15803d' },
  }[pkgStatus.name] ?? { bg: '#f3f4f6', text: '#374151' }

  return (
    <div className={css({
      minH: '100vh',
      bg: 'gray.50',
      _dark: { bg: 'gray.950' },
      display: 'flex',
      flexDir: 'column',
      alignItems: 'center',
      py: '10',
      px: '4',
    })}>
      <div className={css({
        w: 'full',
        maxW: '440px',
        display: 'flex',
        flexDir: 'column',
        gap: '4',
      })}>

        {/* Header */}
        <div className={css({ textAlign: 'center', mb: '2' })}>
          {condo?.photo_url ? (
            <Image
              src={condo.photo_url}
              alt={condo.name}
              width={56}
              height={56}
              className={css({ borderRadius: 'xl', mx: 'auto', mb: '2', objectFit: 'cover' })}
            />
          ) : (
            <div className={css({
              w: '14', h: '14', borderRadius: 'xl', bg: 'blue.600',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              mx: 'auto', mb: '2',
            })}>
              <span className={css({ fontSize: 'xl', fontWeight: 'bold', color: 'white' })}>
                {condo?.name?.[0]?.toUpperCase() ?? 'E'}
              </span>
            </div>
          )}
          <p className={css({ fontSize: 'sm', color: 'gray.500', _dark: { color: 'gray.400' } })}>
            {condo?.name ?? 'Encoraj'}
          </p>
        </div>

        {/* Card principal */}
        <div className={css({
          bg: 'white',
          border: '1px solid',
          borderColor: 'gray.200',
          borderRadius: '2xl',
          overflow: 'hidden',
          _dark: { bg: 'gray.900', borderColor: 'gray.700' },
        })}>

          {/* Foto da etiqueta */}
          {pkg.photo_url && (
            <div className={css({ w: 'full', maxH: '240px', overflow: 'hidden' })}>
              <Image
                src={pkg.photo_url}
                alt="Foto da encomenda"
                width={440}
                height={240}
                className={css({ w: 'full', h: 'full', objectFit: 'cover' })}
              />
            </div>
          )}

          <div className={css({ p: '6', display: 'flex', flexDir: 'column', gap: '5' })}>

            {/* Status */}
            <div className={css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' })}>
              <h1 className={css({ fontSize: 'lg', fontWeight: 'bold', color: 'gray.900', _dark: { color: 'gray.50' } })}>
                Sua encomenda
              </h1>
              <span style={{ background: badgeColor.bg, color: badgeColor.text }}
                className={css({ fontSize: 'xs', fontWeight: 'semibold', px: '3', py: '1', borderRadius: 'full' })}>
                {pkgStatus.label}
              </span>
            </div>

            {/* Banner entregue */}
            {isDelivered && (
              <div className={css({
                bg: 'green.50', border: '1px solid', borderColor: 'green.200',
                borderRadius: 'xl', p: '4', display: 'flex', alignItems: 'center', gap: '3',
                _dark: { bg: 'green.950', borderColor: 'green.800' },
              })}>
                <span className={css({ fontSize: '2xl' })}>✅</span>
                <div>
                  <p className={css({ fontSize: 'sm', fontWeight: 'semibold', color: 'green.800', _dark: { color: 'green.300' } })}>
                    Encomenda retirada
                  </p>
                  {pkg.delivered_at && (
                    <p className={css({ fontSize: 'xs', color: 'green.700', mt: '0.5', _dark: { color: 'green.400' } })}>
                      em {new Date(pkg.delivered_at).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Dados sempre visíveis */}
            <div className={css({ display: 'flex', flexDir: 'column', gap: '3' })}>
              <Row label="Destinatário" value={resident?.name ?? '—'} />
              <Row label="Chegou em" value={new Date(pkg.arrived_at).toLocaleString('pt-BR')} />
              {pkg.notes && <Row label="Observações" value={pkg.notes} />}
            </div>

            {/* Código — só se não entregue */}
            {!isDelivered && (
              <div className={css({
                bg: 'blue.50', border: '1px solid', borderColor: 'blue.200',
                borderRadius: 'xl', p: '4', textAlign: 'center',
                _dark: { bg: 'blue.950', borderColor: 'blue.800' },
              })}>
                <p className={css({ fontSize: 'xs', fontWeight: 'semibold', color: 'blue.600', textTransform: 'uppercase', letterSpacing: 'wide', mb: '1', _dark: { color: 'blue.400' } })}>
                  Código de retirada
                </p>
                <p className={css({ fontFamily: 'mono', fontSize: '2xl', fontWeight: 'bold', color: 'blue.700', letterSpacing: 'widest', _dark: { color: 'blue.300' } })}>
                  {pkg.code}
                </p>
              </div>
            )}

            {/* QR Code — só se não entregue */}
            {!isDelivered && pkg.qrcode_url && (
              <div className={css({ display: 'flex', flexDir: 'column', alignItems: 'center', gap: '2' })}>
                <p className={css({ fontSize: 'xs', color: 'gray.500', _dark: { color: 'gray.400' } })}>
                  ou apresente o QR Code na portaria
                </p>
                <div className={css({ borderRadius: 'lg', overflow: 'hidden', border: '1px solid', borderColor: 'gray.200', _dark: { borderColor: 'gray.700', filter: 'invert(1)' } })}>
                  <Image src={pkg.qrcode_url} alt="QR Code" width={180} height={180} />
                </div>
              </div>
            )}

            {!isDelivered && (
              <p className={css({ fontSize: 'xs', color: 'gray.400', textAlign: 'center', _dark: { color: 'gray.500' } })}>
                Apresente o código ou QR Code ao porteiro para retirar sua encomenda.
              </p>
            )}
          </div>
        </div>

        <p className={css({ fontSize: 'xs', color: 'gray.400', textAlign: 'center', _dark: { color: 'gray.600' } })}>
          Encoraj · Gestão de encomendas
        </p>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '0.5' })}>
      <span className={css({ fontSize: 'xs', fontWeight: 'semibold', color: 'gray.400', textTransform: 'uppercase', letterSpacing: 'wide' })}>
        {label}
      </span>
      <span className={css({ fontSize: 'sm', color: 'gray.800', _dark: { color: 'gray.200' } })}>
        {value}
      </span>
    </div>
  )
}
