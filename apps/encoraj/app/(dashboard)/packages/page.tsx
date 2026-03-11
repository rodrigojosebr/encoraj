import Link from 'next/link'
import { headers } from 'next/headers'
import { ObjectId } from 'mongodb'
import { packages, residents } from '@/lib/db/collections'
import { getStatus, getStatusById } from '@/lib/db/status-map'
import { css } from '@/styled-system/css'
import { Badge, Button } from '@encoraj/ui'

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const { status, q } = await searchParams
  const headersList = await headers()
  const condoId = headersList.get('x-condo-id')!

  const [arrived, notified, delivered] = await Promise.all([
    getStatus('arrived'),
    getStatus('notified'),
    getStatus('delivered'),
  ])

  const FILTERS = [
    { label: 'Todos',            value: '' },
    { label: arrived.label,      value: 'arrived' },
    { label: notified.label,     value: 'notified' },
    { label: delivered.label,    value: 'delivered' },
  ]

  const condoOid = new ObjectId(condoId)
  const filter: Record<string, unknown> = { condo_id: condoOid }
  if (status) filter.status_id = (await getStatus(status))._id

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
          <Button size="sm">Registrar chegada</Button>
        </Link>
      </div>

      {/* Busca */}
      <form method="GET" className={css({ display: 'flex', gap: '2', flexWrap: 'wrap' })}>
        {status && <input type="hidden" name="status" value={status} />}
        <input
          name="q"
          defaultValue={q ?? ''}
          placeholder="Buscar por morador ou código…"
          className={css({
            flex: '1',
            minW: '220px',
            px: '3',
            py: '2',
            fontSize: 'sm',
            borderRadius: 'md',
            border: '1px solid',
            borderColor: 'gray.300',
            bg: 'white',
            color: 'gray.900',
            outline: 'none',
            _focus: { borderColor: 'blue.500', ring: '2px', ringColor: 'blue.200' },
            _dark: { bg: 'gray.900', borderColor: 'gray.600', color: 'gray.100', _focus: { borderColor: 'blue.400', ringColor: 'blue.800' } },
          })}
        />
        <button
          type="submit"
          className={css({ px: '3', py: '2', fontSize: 'sm', fontWeight: 'medium', bg: 'blue.600', color: 'white', borderRadius: 'md', border: 'none', cursor: 'pointer', _hover: { bg: 'blue.700' } })}
        >
          Buscar
        </button>
        {q && (
          <a
            href={status ? `/packages?status=${status}` : '/packages'}
            className={css({ px: '3', py: '2', fontSize: 'sm', fontWeight: 'medium', bg: 'gray.100', color: 'gray.600', borderRadius: 'md', textDecoration: 'none', _hover: { bg: 'gray.200' }, _dark: { bg: 'gray.800', color: 'gray.300', _hover: { bg: 'gray.700' } } })}
          >
            Limpar
          </a>
        )}
      </form>

      {/* Filtros de status */}
      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '2' })}>
        {FILTERS.map((f) => {
          const qParam = q ? `&q=${encodeURIComponent(q)}` : ''
          const href = f.value ? `/packages?status=${f.value}${qParam}` : `/packages${q ? `?q=${encodeURIComponent(q)}` : ''}`
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
                bg: status === f.value || (!status && !f.value) ? 'blue.600' : 'white',
                color: status === f.value || (!status && !f.value) ? 'white' : 'gray.600',
                borderColor: status === f.value || (!status && !f.value) ? 'blue.600' : 'gray.300',
                _hover: { borderColor: 'blue.400' },
                _dark: {
                  bg: status === f.value || (!status && !f.value) ? 'blue.600' : 'gray.900',
                  color: status === f.value || (!status && !f.value) ? 'white' : 'gray.400',
                  borderColor: status === f.value || (!status && !f.value) ? 'blue.600' : 'gray.700',
                },
              })}
            >
              {f.label}
            </button>
          </Link>
          )
        })}
      </div>

      {/* Tabela */}
      <div
        className={css({
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
                      {new Date(pkg.arrived_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className={css({ px: '4', py: '3' })}>
                      <Badge status={statusName as 'arrived' | 'notified' | 'delivered' | 'neutral'}>{statusLabel}</Badge>
                    </td>
                    <td className={css({ px: '4', py: '3' })}>
                      <Link href={`/packages/${pkg._id!.toString()}`}>
                        <Button variant="ghost" intent="secondary" size="sm">Ver</Button>
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
