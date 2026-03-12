import Link from 'next/link'
import { headers } from 'next/headers'
import { ObjectId } from 'mongodb'
import { packages, residents } from '@/lib/db/collections'
import { getStatus, getStatusById } from '@/lib/db/status-map'
import { css } from '@/styled-system/css'
import { Badge, Button } from '@encoraj/ui'
import { Eye, Package, Bell, CheckCircle2 } from 'lucide-react'
import ExportCSV from './_components/ExportCSV'

const inputCss = css({
  px: '3', py: '1.5', fontSize: 'sm', borderRadius: 'md',
  border: '1px solid', borderColor: 'gray.300',
  bg: 'white', color: 'gray.700',
  _dark: { bg: 'gray.800', borderColor: 'gray.600', color: 'gray.200' },
})

const labelCss = css({
  fontSize: 'xs', fontWeight: 'semibold', color: 'gray.500',
  textTransform: 'uppercase', letterSpacing: 'wide',
  _dark: { color: 'gray.400' },
})

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; from?: string; to?: string; q?: string }>
}) {
  const { status, from, to, q } = await searchParams
  const headersList = await headers()
  const condoId = headersList.get('x-condo-id')!

  const [arrived, notified, delivered] = await Promise.all([
    getStatus('arrived'),
    getStatus('notified'),
    getStatus('delivered'),
  ])
  const [arrivedId, notifiedId, deliveredId] = [arrived._id, notified._id, delivered._id]

  const STATUS_OPTIONS = [
    { label: 'Todos',            value: '' },
    { label: arrived.label,      value: 'arrived' },
    { label: notified.label,     value: 'notified' },
    { label: delivered.label,    value: 'delivered' },
  ]

  const col = await packages()
  const condoOid = new ObjectId(condoId)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  // Stats (parallel)
  const [arrivedToday, openCount, deliveredToday, totalCount] = await Promise.all([
    col.countDocuments({ condo_id: condoOid, arrived_at: { $gte: today, $lt: tomorrow } }),
    col.countDocuments({ condo_id: condoOid, status_id: { $in: [arrivedId, notifiedId] } }),
    col.countDocuments({ condo_id: condoOid, status_id: deliveredId, delivered_at: { $gte: today, $lt: tomorrow } }),
    col.countDocuments({ condo_id: condoOid }),
  ])

  // Listing filter
  const filter: Record<string, unknown> = { condo_id: condoOid }
  if (status) filter.status_id = (await getStatus(status))._id
  if (from || to) {
    const range: Record<string, Date> = {}
    if (from) range.$gte = new Date(from)
    if (to) {
      const toDate = new Date(to)
      toDate.setDate(toDate.getDate() + 1)
      range.$lt = toDate
    }
    filter.arrived_at = range
  }

  const resCol = await residents()
  if (q) {
    const matched = await resCol
      .find({ condo_id: condoOid, name: { $regex: q, $options: 'i' } }, { projection: { _id: 1 } })
      .toArray()
    filter.resident_id = { $in: matched.map((r) => r._id!) }
  }

  const docs = await col.find(filter).sort({ arrived_at: -1 }).toArray()

  // Resident map
  const residentIds = [...new Set(docs.map((d) => d.resident_id.toString()))]
  const residentDocs = residentIds.length
    ? await resCol.find({ _id: { $in: residentIds.map((id) => new ObjectId(id)) } }).toArray()
    : []
  const residentMap = Object.fromEntries(residentDocs.map((r) => [r._id!.toString(), r]))

  const statusInfos = await Promise.all(docs.map((d) => getStatusById(d.status_id)))

  const exportRows = docs.map((pkg, i) => {
    const r = residentMap[pkg.resident_id.toString()]
    return {
      codigo:       pkg.code,
      morador:      r?.name ?? '',
      apartamento:  r ? `${r.bloco ? r.bloco + ', ' : ''}Apto ${r.apartment}` : '',
      status:       statusInfos[i].label,
      chegada:      new Date(pkg.arrived_at).toLocaleString('pt-BR'),
      notificado:   pkg.notified_at ? new Date(pkg.notified_at).toLocaleString('pt-BR') : '',
      retirado:     pkg.delivered_at ? new Date(pkg.delivered_at).toLocaleString('pt-BR') : '',
    }
  })

  const statCards = [
    { label: 'Chegadas hoje',   value: arrivedToday },
    { label: 'Em aberto',       value: openCount },
    { label: 'Retiradas hoje',  value: deliveredToday },
    { label: 'Total geral',     value: totalCount },
  ]

  const hasFilter = !!(status || from || to || q)

  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '6' })}>
      {/* Header */}
      <div className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '3' })}>
        <h1 className={css({ fontSize: '2xl', fontWeight: 'bold', color: 'gray.900', _dark: { color: 'gray.50' } })}>
          Relatórios
        </h1>
        <ExportCSV rows={exportRows} />
      </div>

      {/* Stat cards */}
      <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: '4' })}>
        {statCards.map((card) => (
          <div
            key={card.label}
            className={css({
              bg: 'white', border: '1px solid', borderColor: 'gray.200',
              borderRadius: 'lg', p: { base: '4', md: '5' },
              _dark: { bg: 'gray.900', borderColor: 'gray.700' },
            })}
          >
            <p className={css({ fontSize: 'xs', fontWeight: 'semibold', color: 'gray.500', textTransform: 'uppercase', letterSpacing: 'wide', mb: '1', _dark: { color: 'gray.400' } })}>
              {card.label}
            </p>
            <p className={css({ fontSize: '3xl', fontWeight: 'bold', color: 'gray.900', _dark: { color: 'gray.50' } })}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filter form */}
      <form
        method="get"
        action="/reports"
        className={css({ display: 'flex', flexWrap: 'wrap', gap: '4', alignItems: 'flex-end' })}
      >
        <div className={css({ display: 'flex', flexDir: 'column', gap: '1' })}>
          <label className={labelCss}>Status</label>
          <select name="status" defaultValue={status ?? ''} className={inputCss}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className={css({ display: 'flex', flexDir: 'column', gap: '1' })}>
          <label className={labelCss}>De</label>
          <input type="date" name="from" defaultValue={from ?? ''} className={inputCss} />
        </div>

        <div className={css({ display: 'flex', flexDir: 'column', gap: '1' })}>
          <label className={labelCss}>Até</label>
          <input type="date" name="to" defaultValue={to ?? ''} className={inputCss} />
        </div>

        <div className={css({ display: 'flex', flexDir: 'column', gap: '1' })}>
          <label className={labelCss}>Morador</label>
          <input
            type="text"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Buscar por nome..."
            className={css({
              px: '3', py: '1.5', fontSize: 'sm', borderRadius: 'md',
              border: '1px solid', borderColor: 'gray.300',
              bg: 'white', color: 'gray.700',
              _placeholder: { color: 'gray.400' },
              _dark: { bg: 'gray.800', borderColor: 'gray.600', color: 'gray.200', _placeholder: { color: 'gray.500' } },
            })}
          />
        </div>

        <div className={css({ display: 'flex', gap: '2', alignItems: 'flex-end' })}>
          <button
            type="submit"
            className={css({
              px: '4', py: '1.5', fontSize: 'sm', fontWeight: 'medium',
              borderRadius: 'md', bg: 'blue.600', color: 'white',
              border: 'none', cursor: 'pointer',
              _hover: { bg: 'blue.700' },
            })}
          >
            Filtrar
          </button>
          {hasFilter && (
            <Link
              href="/reports"
              className={css({
                px: '4', py: '1.5', fontSize: 'sm', fontWeight: 'medium',
                borderRadius: 'md', bg: 'gray.100', color: 'gray.600',
                textDecoration: 'none',
                _hover: { bg: 'gray.200' },
                _dark: { bg: 'gray.800', color: 'gray.300', _hover: { bg: 'gray.700' } },
              })}
            >
              Limpar
            </Link>
          )}
        </div>
      </form>

      {/* Table */}
      <div
        className={css({
          bg: 'white', border: '1px solid', borderColor: 'gray.200',
          borderRadius: 'lg', overflow: 'hidden',
          _dark: { bg: 'gray.900', borderColor: 'gray.700' },
        })}
      >
        {docs.length === 0 ? (
          <p className={css({ p: '8', textAlign: 'center', color: 'gray.500', fontSize: 'sm', _dark: { color: 'gray.400' } })}>
            Nenhuma encomenda encontrada.
          </p>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className={css({ display: { base: 'flex', md: 'none' }, flexDir: 'column', gap: '3', p: '3' })}>
              {docs.map((pkg, i) => {
                const resident = residentMap[pkg.resident_id.toString()]
                const { name: statusName, label: statusLabel } = statusInfos[i]
                const apt = resident
                  ? `${resident.bloco ? resident.bloco + ', ' : ''}Apto ${resident.apartment}`
                  : '—'
                return (
                  <div
                    key={pkg._id!.toString()}
                    className={css({
                      bg: 'gray.50', border: '1px solid', borderColor: 'gray.200',
                      borderRadius: 'lg', p: '4', display: 'flex', flexDir: 'column', gap: '3',
                      _dark: { bg: 'gray.800', borderColor: 'gray.700' },
                    })}
                  >
                    {/* Header: código + badge */}
                    <div className={css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' })}>
                      <span className={css({ fontSize: 'sm', fontWeight: 'bold', fontFamily: 'mono', color: 'gray.900', _dark: { color: 'gray.100' } })}>
                        {pkg.code}
                      </span>
                      <Badge status={statusName as 'arrived' | 'notified' | 'delivered' | 'neutral'}>
                        {statusLabel}
                      </Badge>
                    </div>

                    {/* Morador + apto */}
                    <div>
                      <p className={css({ fontSize: 'sm', fontWeight: 'medium', color: 'gray.900', _dark: { color: 'gray.100' } })}>
                        {resident?.name ?? '—'}
                      </p>
                      <p className={css({ fontSize: 'xs', color: 'gray.500', _dark: { color: 'gray.400' } })}>
                        {apt}
                      </p>
                    </div>

                    {/* Timeline */}
                    <div className={css({ display: 'flex', alignItems: 'center', gap: '2' })}>
                      <div className={css({ display: 'flex', flexDir: 'column', alignItems: 'center', gap: '0.5', flex: '1' })}>
                        <Package size={14} className={css({ color: 'green.500', _dark: { color: 'green.400' } })} />
                        <span className={css({ fontSize: '10px', fontWeight: 'medium', color: 'green.600', _dark: { color: 'green.400' } })}>Chegada</span>
                        <span className={css({ fontSize: '10px', color: 'gray.500', _dark: { color: 'gray.400' } })}>
                          {new Date(pkg.arrived_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <span className={css({ color: 'gray.300', fontSize: 'xs', _dark: { color: 'gray.600' } })}>──</span>
                      <div className={css({ display: 'flex', flexDir: 'column', alignItems: 'center', gap: '0.5', flex: '1' })}>
                        <Bell size={14} className={css({ color: pkg.notified_at ? 'blue.500' : 'gray.300', _dark: { color: pkg.notified_at ? 'blue.400' : 'gray.600' } })} />
                        <span className={css({ fontSize: '10px', fontWeight: 'medium', color: pkg.notified_at ? 'blue.600' : 'gray.400', _dark: { color: pkg.notified_at ? 'blue.400' : 'gray.600' } })}>Notif.</span>
                        <span className={css({ fontSize: '10px', color: 'gray.500', _dark: { color: 'gray.400' } })}>
                          {pkg.notified_at ? new Date(pkg.notified_at).toLocaleDateString('pt-BR') : '—'}
                        </span>
                      </div>
                      <span className={css({ color: 'gray.300', fontSize: 'xs', _dark: { color: 'gray.600' } })}>──</span>
                      <div className={css({ display: 'flex', flexDir: 'column', alignItems: 'center', gap: '0.5', flex: '1' })}>
                        <CheckCircle2 size={14} className={css({ color: pkg.delivered_at ? 'green.500' : 'gray.300', _dark: { color: pkg.delivered_at ? 'green.400' : 'gray.600' } })} />
                        <span className={css({ fontSize: '10px', fontWeight: 'medium', color: pkg.delivered_at ? 'green.600' : 'gray.400', _dark: { color: pkg.delivered_at ? 'green.400' : 'gray.600' } })}>Retirada</span>
                        <span className={css({ fontSize: '10px', color: 'gray.500', _dark: { color: 'gray.400' } })}>
                          {pkg.delivered_at ? new Date(pkg.delivered_at).toLocaleDateString('pt-BR') : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Ação */}
                    <Link href={`/packages/${pkg._id!.toString()}`}>
                      <Button variant="outline" intent="primary" size="sm" leftIcon={<Eye size={14} />} style={{ width: '100%' }}>
                        Ver encomenda
                      </Button>
                    </Link>
                  </div>
                )
              })}
            </div>

            {/* Desktop: tabela */}
            <div className={css({ display: { base: 'none', md: 'block' }, overflowX: 'auto' })}>
              <table className={css({ w: 'full', minW: '720px', borderCollapse: 'collapse' })}>
                <thead>
                  <tr className={css({ bg: 'gray.50', borderBottom: '1px solid', borderColor: 'gray.200', _dark: { bg: 'gray.800', borderColor: 'gray.700' } })}>
                    {['Código', 'Morador', 'Apartamento', 'Chegada', 'Timeline', 'Status', ''].map((h) => (
                      <th
                        key={h}
                        className={css({
                          px: '4', py: '3', textAlign: 'left', fontSize: 'xs',
                          fontWeight: 'semibold', color: 'gray.500',
                          textTransform: 'uppercase', letterSpacing: 'wide',
                          _dark: { color: 'gray.400' },
                        })}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {docs.map((pkg, i) => {
                    const resident = residentMap[pkg.resident_id.toString()]
                    const { name: statusName, label: statusLabel } = statusInfos[i]
                    const apt = resident
                      ? `${resident.bloco ? resident.bloco + ', ' : ''}Apto ${resident.apartment}`
                      : '—'
                    return (
                      <tr
                        key={pkg._id!.toString()}
                        className={css({
                          borderBottom: '1px solid', borderColor: 'gray.100',
                          _hover: { bg: 'gray.50' },
                          _dark: { borderColor: 'gray.800', _hover: { bg: 'gray.800' } },
                        })}
                      >
                        <td className={css({ px: '4', py: '3', fontSize: 'sm', fontWeight: 'medium', fontFamily: 'mono', color: 'gray.900', _dark: { color: 'gray.100' } })}>
                          {pkg.code}
                        </td>
                        <td className={css({ px: '4', py: '3', fontSize: 'sm', color: 'gray.900', _dark: { color: 'gray.100' } })}>
                          {resident?.name ?? '—'}
                        </td>
                        <td className={css({ px: '4', py: '3', fontSize: 'sm', color: 'gray.600', _dark: { color: 'gray.400' } })}>
                          {apt}
                        </td>
                        <td className={css({ px: '4', py: '3', fontSize: 'sm', color: 'gray.600', _dark: { color: 'gray.400' } })}>
                          {new Date(pkg.arrived_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className={css({ px: '4', py: '3' })}>
                          <div className={css({ display: 'flex', alignItems: 'center', gap: '2' })}>
                            <div className={css({ display: 'flex', flexDir: 'column', alignItems: 'center', gap: '0.5', minW: '48px' })}>
                              <Package size={14} className={css({ color: 'green.500', _dark: { color: 'green.400' } })} />
                              <span className={css({ fontSize: '10px', fontWeight: 'medium', color: 'green.600', _dark: { color: 'green.400' } })}>Chegada</span>
                              <span className={css({ fontSize: '10px', color: 'gray.500', _dark: { color: 'gray.400' } })}>
                                {new Date(pkg.arrived_at).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            <span className={css({ color: 'gray.300', fontSize: 'xs', _dark: { color: 'gray.600' } })}>──</span>
                            <div className={css({ display: 'flex', flexDir: 'column', alignItems: 'center', gap: '0.5', minW: '48px' })}>
                              <Bell size={14} className={css({ color: pkg.notified_at ? 'blue.500' : 'gray.300', _dark: { color: pkg.notified_at ? 'blue.400' : 'gray.600' } })} />
                              <span className={css({ fontSize: '10px', fontWeight: 'medium', color: pkg.notified_at ? 'blue.600' : 'gray.400', _dark: { color: pkg.notified_at ? 'blue.400' : 'gray.600' } })}>Notif.</span>
                              <span className={css({ fontSize: '10px', color: 'gray.500', _dark: { color: 'gray.400' } })}>
                                {pkg.notified_at ? new Date(pkg.notified_at).toLocaleDateString('pt-BR') : '—'}
                              </span>
                            </div>
                            <span className={css({ color: 'gray.300', fontSize: 'xs', _dark: { color: 'gray.600' } })}>──</span>
                            <div className={css({ display: 'flex', flexDir: 'column', alignItems: 'center', gap: '0.5', minW: '48px' })}>
                              <CheckCircle2 size={14} className={css({ color: pkg.delivered_at ? 'green.500' : 'gray.300', _dark: { color: pkg.delivered_at ? 'green.400' : 'gray.600' } })} />
                              <span className={css({ fontSize: '10px', fontWeight: 'medium', color: pkg.delivered_at ? 'green.600' : 'gray.400', _dark: { color: pkg.delivered_at ? 'green.400' : 'gray.600' } })}>Retirada</span>
                              <span className={css({ fontSize: '10px', color: 'gray.500', _dark: { color: 'gray.400' } })}>
                                {pkg.delivered_at ? new Date(pkg.delivered_at).toLocaleDateString('pt-BR') : '—'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className={css({ px: '4', py: '3' })}>
                          <Badge status={statusName as 'arrived' | 'notified' | 'delivered' | 'neutral'}>
                            {statusLabel}
                          </Badge>
                        </td>
                        <td className={css({ px: '4', py: '3' })}>
                          <Link href={`/packages/${pkg._id!.toString()}`}>
                            <Button variant="ghost" intent="primary" size="sm" leftIcon={<Eye size={14} />}>
                              Ver
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
