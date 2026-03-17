import Link from 'next/link'
import { headers } from 'next/headers'
import { ObjectId } from 'mongodb'
import { packages, residents } from '@/lib/db/collections'
import { getStatus, getStatusById } from '@/lib/db/status-map'
import { css } from '@/styled-system/css'
import { Eye, PackagePlus } from 'lucide-react'
import { Badge, Button } from '@encoraj/ui'
import SearchInput from '../_components/SearchInput'
import { getTodayRange, fmtDate } from '@/lib/date/tz'

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; period?: string }>
}) {
  const { status, q, period } = await searchParams
  const headersList = await headers()
  const condoId = headersList.get('x-condo-id')!

  const [arrived, notified, delivered] = await Promise.all([
    getStatus('arrived'),
    getStatus('notified'),
    getStatus('delivered'),
  ])

  const FILTERS = [
    { label: 'Todos',            value: '' },
    { label: 'Em aberto',        value: 'open' },
    { label: arrived.label,      value: 'arrived' },
    { label: notified.label,     value: 'notified' },
    { label: delivered.label,    value: 'delivered' },
  ]

  const condoOid = new ObjectId(condoId)
  const filter: Record<string, unknown> = { condo_id: condoOid }

  if (status === 'open') {
    filter.status_id = { $in: [arrived._id, notified._id] }
  } else if (status) {
    filter.status_id = (await getStatus(status))._id
  }

  if (period === 'today') {
    const { today, tomorrow } = getTodayRange()
    if (status === 'delivered') {
      filter.delivered_at = { $gte: today, $lt: tomorrow }
    } else {
      filter.arrived_at = { $gte: today, $lt: tomorrow }
    }
  }

  const resCol = await residents()

  // Busca por texto: filtra por código OU por moradores cujo nome bate
  if (q?.trim()) {
    const regex = { $regex: q.trim(), $options: 'i' }
    const matchingResidents = await resCol
      .find({ condo_id: condoOid, name: regex })
      .project({ _id: 1 })
      .toArray()
    const residentOids = matchingResidents.map((r) => r._id!)
    filter.$or = [
      { code: regex },
      ...(residentOids.length > 0 ? [{ resident_id: { $in: residentOids } }] : []),
    ]
  }

  const col = await packages()
  const docs = await col.find(filter).sort({ arrived_at: -1 }).toArray()

  // Resolve status info (name for Badge, label for display) per package — single call each
  const statusInfos = await Promise.all(docs.map((d) => getStatusById(d.status_id)))

  // Busca nomes dos moradores em lote
  const residentIds = [...new Set(docs.map((d) => d.resident_id.toString()))]
  const residentDocs = await resCol
    .find({ _id: { $in: residentIds.map((id) => new ObjectId(id)) } })
    .toArray()
  const residentMap = Object.fromEntries(residentDocs.map((r) => [r._id!.toString(), r]))

  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '6' })}>
      {/* Header */}
      <div className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '3' })}>
        <h1 className={css({ fontSize: '2xl', fontWeight: 'bold', color: 'gray.900', _dark: { color: 'gray.50' } })}>
          Encomendas
        </h1>
        <Link href="/packages/new">
          <Button leftIcon={<PackagePlus size={18} />}>Registrar chegada</Button>
        </Link>
      </div>

      {/* Busca */}
      <SearchInput placeholder="Buscar por morador ou código…" defaultValue={q ?? ''} />

      {/* Filtros de status */}
      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '2' })}>
        {FILTERS.map((f) => {
          const qParam = q ? `&q=${encodeURIComponent(q)}` : ''
          const href = f.value ? `/packages?status=${f.value}${qParam}` : `/packages${q ? `?q=${encodeURIComponent(q)}` : ''}`
          const isActive = status === f.value || (!status && !f.value)
          return (
          <Link key={f.value} href={href}>
            <button
              className={css({
                px: '3',
                py: '1.5',
                borderRadius: 'full',
                fontSize: 'sm',
                fontWeight: 'medium',
                border: '1px solid',
                cursor: 'pointer',
                bg: isActive ? 'blue.600' : 'white',
                color: isActive ? 'white' : 'gray.600',
                borderColor: isActive ? 'blue.600' : 'gray.300',
                _hover: { borderColor: 'blue.400' },
                _dark: {
                  bg: isActive ? 'blue.600' : 'gray.900',
                  color: isActive ? 'white' : 'gray.400',
                  borderColor: isActive ? 'blue.600' : 'gray.700',
                },
              })}
            >
              {f.label}
            </button>
          </Link>
          )
        })}
      </div>

      {/* Cards mobile */}
      <div className={css({ display: { base: 'flex', md: 'none' }, flexDir: 'column', gap: '3' })}>
        {docs.length === 0 ? (
          <p className={css({ textAlign: 'center', color: 'gray.500', fontSize: 'sm', py: '8', _dark: { color: 'gray.400' } })}>
            Nenhuma encomenda encontrada.
          </p>
        ) : docs.map((pkg, i) => {
          const resident = residentMap[pkg.resident_id.toString()]
          const { name: statusName, label: statusLabel } = statusInfos[i]
          return (
            <Link key={pkg._id!.toString()} href={`/packages/${pkg._id!.toString()}`} className={css({ textDecoration: 'none' })}>
              <div className={css({
                bg: 'white', border: '1px solid', borderColor: 'gray.200',
                borderRadius: 'xl', p: '4', display: 'flex', flexDir: 'column', gap: '3',
                _hover: { borderColor: 'blue.300', bg: 'blue.50' },
                _dark: { bg: 'gray.900', borderColor: 'gray.700', _hover: { bg: 'gray.800', borderColor: 'blue.700' } },
              })}>
                <div className={css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' })}>
                  <span className={css({ fontFamily: 'mono', fontSize: 'sm', fontWeight: 'bold', color: 'gray.900', _dark: { color: 'gray.100' } })}>
                    {pkg.code}
                  </span>
                  <Badge status={statusName as 'arrived' | 'notified' | 'delivered' | 'neutral'}>{statusLabel}</Badge>
                </div>
                <div className={css({ display: 'flex', flexDir: 'column', gap: '1' })}>
                  <p className={css({ fontSize: 'sm', fontWeight: 'medium', color: 'gray.900', _dark: { color: 'gray.100' } })}>
                    {resident?.name ?? '—'}
                  </p>
                  <p className={css({ fontSize: 'xs', color: 'gray.500', _dark: { color: 'gray.400' } })}>
                    {resident?.apartment ? `Apto ${resident.apartment}` : '—'}{resident?.bloco ? ` · ${resident.bloco}` : ''}
                    {' · '}chegou em {fmtDate(pkg.arrived_at)}
                  </p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Tabela desktop */}
      <div
        className={css({
          display: { base: 'none', md: 'block' },
          bg: 'white',
          border: '1px solid',
          borderColor: 'gray.200',
          borderRadius: 'lg',
          overflow: 'hidden',
          _dark: { bg: 'gray.900', borderColor: 'gray.700' },
        })}
      >
        {docs.length === 0 ? (
          <p className={css({ p: '8', textAlign: 'center', color: 'gray.500', fontSize: 'sm', _dark: { color: 'gray.400' } })}>
            Nenhuma encomenda encontrada.
          </p>
        ) : (
          <div className={css({ overflowX: 'auto' })}>
          <table className={css({ w: 'full', minW: '600px', borderCollapse: 'collapse' })}>
            <thead>
              <tr className={css({ bg: 'gray.50', borderBottom: '1px solid', borderColor: 'gray.200', _dark: { bg: 'gray.800', borderColor: 'gray.700' } })}>
                {['Código', 'Morador', 'Apartamento', 'Chegada', 'Status', ''].map((h) => (
                  <th
                    key={h}
                    className={css({
                      px: '4',
                      py: '3',
                      textAlign: 'left',
                      fontSize: 'xs',
                      fontWeight: 'semibold',
                      color: 'gray.500',
                      textTransform: 'uppercase',
                      letterSpacing: 'wide',
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
                return (
                  <tr
                    key={pkg._id!.toString()}
                    className={css({ borderBottom: '1px solid', borderColor: 'gray.100', _hover: { bg: 'gray.50' }, _dark: { borderColor: 'gray.800', _hover: { bg: 'gray.800' } } })}
                  >
                    <td className={css({ px: '4', py: '3', fontSize: 'sm', fontWeight: 'medium', color: 'gray.900', fontFamily: 'mono', _dark: { color: 'gray.100' } })}>
                      {pkg.code}
                    </td>
                    <td className={css({ px: '4', py: '3', fontSize: 'sm', color: 'gray.900', _dark: { color: 'gray.100' } })}>
                      {resident?.name ?? '—'}
                    </td>
                    <td className={css({ px: '4', py: '3', fontSize: 'sm', color: 'gray.600', _dark: { color: 'gray.400' } })}>
                      {resident?.apartment ?? '—'}
                    </td>
                    <td className={css({ px: '4', py: '3', fontSize: 'sm', color: 'gray.600', _dark: { color: 'gray.400' } })}>
                      {fmtDate(pkg.arrived_at)}
                    </td>
                    <td className={css({ px: '4', py: '3' })}>
                      <Badge status={statusName as 'arrived' | 'notified' | 'delivered' | 'neutral'}>{statusLabel}</Badge>
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
        )}
      </div>
    </div>
  )
}
