import Link from 'next/link'
import { headers } from 'next/headers'
import { ObjectId } from 'mongodb'
import { packages, residents } from '@/lib/db/collections'
import { getStatus, getStatusById, getRole } from '@/lib/db/status-map'
import { css } from '@/styled-system/css'
import { Eye } from 'lucide-react'
import { Badge } from '@encoraj/ui'

export default async function DashboardPage() {
  const headersList = await headers()
  const name = headersList.get('x-user-name') ?? ''
  const role = headersList.get('x-user-role') ?? ''
  const condoId = headersList.get('x-condo-id')!

  const roleLabel = await getRole(role).then(r => r.label).catch(() => role)

  const col = await packages()
  const condoOid = new ObjectId(condoId)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const [arrivedId, notifiedId, deliveredId] = await Promise.all([
    getStatus('arrived').then(s => s._id),
    getStatus('notified').then(s => s._id),
    getStatus('delivered').then(s => s._id),
  ])

  const [arrivedToday, openCount, deliveredToday, totalCount] = await Promise.all([
    col.countDocuments({ condo_id: condoOid, arrived_at: { $gte: today, $lt: tomorrow } }),
    col.countDocuments({ condo_id: condoOid, status_id: { $in: [arrivedId, notifiedId] } }),
    col.countDocuments({ condo_id: condoOid, status_id: deliveredId, delivered_at: { $gte: today, $lt: tomorrow } }),
    col.countDocuments({ condo_id: condoOid }),
  ])

  // Recent packages (last 5)
  const recentDocs = await col
    .find({ condo_id: condoOid })
    .sort({ arrived_at: -1 })
    .limit(5)
    .toArray()

  const residentIds = [...new Set(recentDocs.map((d) => d.resident_id.toString()))]
  const resCol = await residents()
  const residentDocs = residentIds.length
    ? await resCol.find({ _id: { $in: residentIds.map((id) => new ObjectId(id)) } }).toArray()
    : []
  const residentMap = Object.fromEntries(residentDocs.map((r) => [r._id!.toString(), r]))

  const recentStatusInfos = await Promise.all(recentDocs.map((d) => getStatusById(d.status_id)))

  const statCards = [
    { label: 'Chegadas hoje',  value: arrivedToday },
    { label: 'Em aberto',      value: openCount },
    { label: 'Retiradas hoje', value: deliveredToday },
    { label: 'Total geral',    value: totalCount },
  ]

  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '6' })}>
      {/* Header */}
      <div>
        <h1 className={css({ fontSize: '2xl', fontWeight: 'bold', color: 'gray.900', _dark: { color: 'gray.50' } })}>
          Olá, {name}
        </h1>
        <p className={css({ fontSize: 'sm', color: 'gray.500', mt: '1', _dark: { color: 'gray.400' } })}>
          {roleLabel}
        </p>
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

      {/* Recent packages */}
      <div>
        <div className={css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '3' })}>
          <h2 className={css({ fontSize: 'lg', fontWeight: 'semibold', color: 'gray.900', _dark: { color: 'gray.50' } })}>
            Encomendas recentes
          </h2>
          <Link
            href="/packages"
            className={css({ fontSize: 'sm', color: 'blue.600', textDecoration: 'none', _hover: { textDecoration: 'underline' }, _dark: { color: 'blue.400' } })}
          >
            Ver todas
          </Link>
        </div>

        {/* Cards mobile */}
        <div className={css({ display: { base: 'flex', md: 'none' }, flexDir: 'column', gap: '3' })}>
          {recentDocs.length === 0 ? (
            <p className={css({ textAlign: 'center', color: 'gray.500', fontSize: 'sm', py: '8', _dark: { color: 'gray.400' } })}>
              Nenhuma encomenda registrada ainda.
            </p>
          ) : recentDocs.map((pkg, i) => {
            const resident = residentMap[pkg.resident_id.toString()]
            const { name: statusName, label: statusLabel } = recentStatusInfos[i]
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
                      {resident ? `${resident.bloco ? resident.bloco + ' · ' : ''}Apto ${resident.apartment}` : '—'}
                      {' · '}chegou em {new Date(pkg.arrived_at).toLocaleDateString('pt-BR')}
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
            bg: 'white', border: '1px solid', borderColor: 'gray.200',
            borderRadius: 'lg', overflow: 'hidden',
            _dark: { bg: 'gray.900', borderColor: 'gray.700' },
          })}
        >
          {recentDocs.length === 0 ? (
            <p className={css({ p: '8', textAlign: 'center', color: 'gray.500', fontSize: 'sm', _dark: { color: 'gray.400' } })}>
              Nenhuma encomenda registrada ainda.
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
                  {recentDocs.map((pkg, i) => {
                    const resident = residentMap[pkg.resident_id.toString()]
                    const { name: statusName, label: statusLabel } = recentStatusInfos[i]
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
                          {resident ? `${resident.bloco ? resident.bloco + ', ' : ''}Apto ${resident.apartment}` : '—'}
                        </td>
                        <td className={css({ px: '4', py: '3', fontSize: 'sm', color: 'gray.600', _dark: { color: 'gray.400' } })}>
                          {new Date(pkg.arrived_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className={css({ px: '4', py: '3' })}>
                          <Badge status={statusName as 'arrived' | 'notified' | 'delivered' | 'neutral'}>
                            {statusLabel}
                          </Badge>
                        </td>
                        <td className={css({ px: '4', py: '3' })}>
                          <Link href={`/packages/${pkg._id!.toString()}`} className={css({
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            w: '8', h: '8', borderRadius: 'md', color: 'gray.400',
                            transition: 'all 0.15s',
                            _hover: { color: 'blue.600', bg: 'blue.50' },
                            _dark: { color: 'gray.500', _hover: { color: 'blue.400', bg: 'blue.950' } },
                          })}>
                            <Eye size={16} />
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
    </div>
  )
}
