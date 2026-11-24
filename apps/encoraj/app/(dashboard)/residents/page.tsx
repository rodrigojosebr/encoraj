import Link from 'next/link'
import { FileSpreadsheet, Pencil, UserPlus } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'
import { ObjectId } from 'mongodb'
import { residents } from '@/lib/db/collections'
import { formatUnit } from '@/lib/residents/lookup'
import { readSession } from '@/lib/auth/session'
import { escapeRegex } from '@/lib/db/escape-regex'
import { getStatus } from '@/lib/db/status-map'
import { css } from '@/styled-system/css'
import { Button } from '@encoraj/ui'
import DeleteButton from './_components/DeleteButton'
import RestoreButton from './_components/RestoreButton'
import DeletedToggle from '../_components/DeletedToggle'
import { fmtDate } from '@/lib/date/tz'
import { paginate, parsePage } from '@/lib/pagination'
import { can } from '@/lib/auth/permissions'
import Pagination from '../_components/Pagination'
import SearchInput from '../_components/SearchInput'

export default async function ResidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; deleted?: string; page?: string }>
}) {
  const { q, deleted, page: pageParam } = await searchParams
  const showDeleted = deleted === '1'
  const session = await readSession()
  if (!session) redirect('/api/auth/logout')
  if (!can(session, 'residents.write')) notFound()
  const col = await residents()

  const { _id: statusId } = await getStatus(showDeleted ? 'deleted' : 'active')
  const filter: Record<string, unknown> = { condo_id: new ObjectId(session.condoId), status_id: statusId }

  if (q?.trim()) {
    const regex = { $regex: escapeRegex(q.trim()), $options: 'i' }
    filter.$or = [{ name: regex }, { apartment: regex }, { block: regex }]
  }

  const pagination = paginate(await col.countDocuments(filter), parsePage(pageParam))
  const docs = await col
    .find(filter)
    .sort({ name: 1 })
    .skip(pagination.skip)
    .limit(pagination.pageSize)
    .toArray()

  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '6' })}>
      {/* Header */}
      <div className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '3' })}>
        <h1 className={css({ fontSize: '2xl', fontWeight: 'bold', color: 'gray.900', _dark: { color: 'gray.50' } })}>
          Moradores
        </h1>
        <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '2' })}>
          {can(session, 'residents.import') && (
            <Link href="/residents/import">
              <Button variant="outline" intent="secondary" leftIcon={<FileSpreadsheet size={18} />}>Importar planilha</Button>
            </Link>
          )}
          <Link href="/residents/new">
            <Button leftIcon={<UserPlus size={18} />}>Novo morador</Button>
          </Link>
        </div>
      </div>

      {/* Search + filtro */}
      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '3', alignItems: 'center' })}>
        <SearchInput placeholder="Buscar por nome ou apartamento…" defaultValue={q ?? ''} minChars={1} />
        <DeletedToggle pathname="/residents" />
      </div>

      {/* Mobile: cards */}
      <div className={css({ display: { base: 'flex', md: 'none' }, flexDir: 'column', gap: '3' })}>
        {docs.length === 0 ? (
          <p className={css({ p: '6', textAlign: 'center', color: 'gray.500', fontSize: 'sm', _dark: { color: 'gray.400' } })}>
            {showDeleted
              ? 'Nenhum morador excluído.'
              : q
                ? 'Nenhum morador encontrado para essa busca.'
                : 'Nenhum morador cadastrado ainda.'}
          </p>
        ) : docs.map((r) => (
          <div
            key={r._id!.toString()}
            className={css({
              bg: 'white',
              border: '1px solid',
              borderColor: 'gray.200',
              borderRadius: 'lg',
              p: '4',
              display: 'flex',
              flexDir: 'column',
              gap: '2',
              _dark: { bg: 'gray.900', borderColor: 'gray.700' },
            })}
          >
            <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' })}>
              <div>
                <p className={css({ fontSize: 'sm', fontWeight: 'semibold', color: showDeleted ? 'gray.400' : 'gray.900', _dark: { color: showDeleted ? 'gray.500' : 'gray.100' } })}>
                  {r.name}
                </p>
                <p className={css({ fontSize: 'xs', color: 'gray.500', mt: '0.5', _dark: { color: 'gray.400' } })}>
                  {formatUnit(r)}
                </p>
                <p className={css({ fontSize: 'xs', color: 'gray.500', _dark: { color: 'gray.400' } })}>
                  {r.whatsapp}
                </p>
              </div>
              {showDeleted && r.deleted_at && (
                <span className={css({ fontSize: 'xs', color: 'gray.400', _dark: { color: 'gray.500' } })}>
                  {fmtDate(r.deleted_at)}
                </span>
              )}
            </div>
            <div className={css({ display: 'flex', gap: '2' })}>
              {showDeleted ? (
                <RestoreButton id={r._id!.toString()} name={r.name} />
              ) : (
                <>
                  <Link href={`/residents/${r._id!.toString()}/edit`} title="Editar morador" className={css({
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    w: '8', h: '8', borderRadius: 'md', color: 'gray.400', transition: 'all 0.15s',
                    _hover: { color: 'blue.600', bg: 'blue.50' },
                    _dark: { color: 'gray.500', _hover: { color: 'blue.400', bg: 'blue.950' } },
                  })}>
                    <Pencil size={16} />
                  </Link>
                  <DeleteButton id={r._id!.toString()} name={r.name} />
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: tabela */}
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
            {showDeleted
              ? 'Nenhum morador excluído.'
              : q
                ? 'Nenhum morador encontrado para essa busca.'
                : 'Nenhum morador cadastrado ainda.'}
          </p>
        ) : (
          <div className={css({ overflowX: 'auto' })}>
          <table className={css({ w: 'full', minW: '600px', borderCollapse: 'collapse' })}>
            <thead>
              <tr className={css({ bg: 'gray.50', borderBottom: '1px solid', borderColor: 'gray.200', _dark: { bg: 'gray.800', borderColor: 'gray.700' } })}>
                {['Nome', 'Unidade', 'WhatsApp', showDeleted ? 'Excluído em' : 'Ações'].map((h) => (
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
              {docs.map((r) => (
                <tr
                  key={r._id!.toString()}
                  className={css({ borderBottom: '1px solid', borderColor: 'gray.100', _hover: { bg: 'gray.50' }, _dark: { borderColor: 'gray.800', _hover: { bg: 'gray.800' } } })}
                >
                  <td className={css({ px: '4', py: '3', fontSize: 'sm', color: showDeleted ? 'gray.400' : 'gray.900', fontWeight: 'medium', _dark: { color: showDeleted ? 'gray.500' : 'gray.100' } })}>
                    {r.name}
                  </td>
                  <td className={css({ px: '4', py: '3', fontSize: 'sm', color: 'gray.600', _dark: { color: 'gray.400' } })}>
                    {formatUnit(r)}
                  </td>
                  <td className={css({ px: '4', py: '3', fontSize: 'sm', color: 'gray.600', _dark: { color: 'gray.400' } })}>
                    {r.whatsapp}
                  </td>
                  <td className={css({ px: '4', py: '3', display: 'flex', gap: '2' })}>
                    {showDeleted ? (
                      <>
                        <span className={css({ fontSize: 'sm', color: 'gray.500', alignSelf: 'center', _dark: { color: 'gray.400' } })}>
                          {r.deleted_at ? fmtDate(r.deleted_at) : '—'}
                        </span>
                        <RestoreButton id={r._id!.toString()} name={r.name} />
                      </>
                    ) : (
                      <>
                        <Link href={`/residents/${r._id!.toString()}/edit`}>
                          <Button variant="ghost" intent="secondary" size="sm">Editar</Button>
                        </Link>
                        <DeleteButton id={r._id!.toString()} name={r.name} />
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      <Pagination pathname="/residents" params={{ q, deleted }} pagination={pagination} />
    </div>
  )
}
