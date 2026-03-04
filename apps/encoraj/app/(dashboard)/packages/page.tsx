import Link from 'next/link'
import { headers } from 'next/headers'
import { ObjectId } from 'mongodb'
import { packages, residents } from '@/lib/db/collections'
import { getStatusId, getStatusName } from '@/lib/db/status-map'
import { css } from '@/styled-system/css'
import { Badge, Button } from '@encoraj/ui'

const STATUS_LABEL: Record<string, string> = {
  arrived:   'Chegou',
  notified:  'Notificado',
  delivered: 'Retirado',
}

const FILTERS: Array<{ label: string; value: string }> = [
  { label: 'Todos',      value: '' },
  { label: 'Chegou',     value: 'arrived' },
  { label: 'Notificado', value: 'notified' },
  { label: 'Retirado',   value: 'delivered' },
]

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const headersList = await headers()
  const condoId = headersList.get('x-condo-id')!

  const filter: Record<string, unknown> = { condo_id: new ObjectId(condoId) }
  if (status) filter.status_id = await getStatusId(status)

  const col = await packages()
  const docs = await col.find(filter).sort({ arrived_at: -1 }).toArray()

  // Resolve status names for all packages
  const statusNames = await Promise.all(docs.map((d) => getStatusName(d.status_id)))

  // Busca nomes dos moradores em lote
  const residentIds = [...new Set(docs.map((d) => d.resident_id.toString()))]
  const resCol = await residents()
  const residentDocs = await resCol
    .find({ _id: { $in: residentIds.map((id) => new ObjectId(id)) } })
    .toArray()
  const residentMap = Object.fromEntries(residentDocs.map((r) => [r._id!.toString(), r]))

  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '6' })}>
      {/* Header */}
      <div className={css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' })}>
        <h1 className={css({ fontSize: '2xl', fontWeight: 'bold', color: 'gray.900' })}>
          Encomendas
        </h1>
        <Link href="/packages/new">
          <Button size="sm">Registrar chegada</Button>
        </Link>
      </div>

      {/* Filtros de status */}
      <div className={css({ display: 'flex', gap: '2' })}>
        {FILTERS.map((f) => (
          <Link key={f.value} href={f.value ? `/packages?status=${f.value}` : '/packages'}>
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
              })}
            >
              {f.label}
            </button>
          </Link>
        ))}
      </div>

      {/* Tabela */}
      <div
        className={css({
          bg: 'white',
          border: '1px solid',
          borderColor: 'gray.200',
          borderRadius: 'lg',
          overflow: 'hidden',
        })}
      >
        {docs.length === 0 ? (
          <p className={css({ p: '8', textAlign: 'center', color: 'gray.500', fontSize: 'sm' })}>
            Nenhuma encomenda encontrada.
          </p>
        ) : (
          <table className={css({ w: 'full', borderCollapse: 'collapse' })}>
            <thead>
              <tr className={css({ bg: 'gray.50', borderBottom: '1px solid', borderColor: 'gray.200' })}>
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
                const statusName = statusNames[i]
                return (
                  <tr
                    key={pkg._id!.toString()}
                    className={css({ borderBottom: '1px solid', borderColor: 'gray.100', _hover: { bg: 'gray.50' } })}
                  >
                    <td className={css({ px: '4', py: '3', fontSize: 'sm', fontWeight: 'medium', color: 'gray.900', fontFamily: 'mono' })}>
                      {pkg.code}
                    </td>
                    <td className={css({ px: '4', py: '3', fontSize: 'sm', color: 'gray.900' })}>
                      {resident?.name ?? '—'}
                    </td>
                    <td className={css({ px: '4', py: '3', fontSize: 'sm', color: 'gray.600' })}>
                      {resident?.apartment ?? '—'}
                    </td>
                    <td className={css({ px: '4', py: '3', fontSize: 'sm', color: 'gray.600' })}>
                      {new Date(pkg.arrived_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className={css({ px: '4', py: '3' })}>
                      <Badge status={statusName as 'arrived' | 'notified' | 'delivered' | 'neutral'}>{STATUS_LABEL[statusName] ?? statusName}</Badge>
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
        )}
      </div>
    </div>
  )
}
