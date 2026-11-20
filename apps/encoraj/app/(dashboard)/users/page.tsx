import Link from 'next/link'
import { UserPlus } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'
import { ObjectId } from 'mongodb'
import { readSession } from '@/lib/auth/session'
import { can } from '@/lib/auth/permissions'
import { roles, users } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { paginate, parsePage } from '@/lib/pagination'
import { css } from '@/styled-system/css'
import { Button } from '@encoraj/ui'
import Pagination from '../_components/Pagination'
import DeletedToggle from '../_components/DeletedToggle'
import { UserCard, UserRow, type UserListItem } from './_components/UserItems'

const TABLE_HEADERS = ['Nome', 'E-mail', 'Perfil', 'Status', 'Ações']
const thCss = css({ px: '4', py: '3', textAlign: 'left', fontSize: 'xs', fontWeight: 'semibold', color: 'gray.500', textTransform: 'uppercase', letterSpacing: 'wide', _dark: { color: 'gray.400' } })
const emptyCss = css({ fontSize: 'sm', color: 'gray.500', _dark: { color: 'gray.400' } })

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ deleted?: string; page?: string }> }) {
  const session = await readSession()
  if (!session) redirect('/api/auth/logout')
  if (!can(session, 'users.manage')) notFound()

  const { deleted, page: pageParam } = await searchParams
  const showDeleted = deleted === '1'

  const [status, activeStatus, allRoles] = await Promise.all([
    getStatus(showDeleted ? 'deleted' : 'active'),
    getStatus('active'),
    (await roles()).find({}, { projection: { label: 1 } }).toArray(),
  ])
  const roleLabelById = new Map(allRoles.map((role) => [role._id!.toString(), role.label]))

  const col = await users()
  const filter = { condo_id: new ObjectId(session.condoId), status_id: status._id }
  const pagination = paginate(await col.countDocuments(filter), parsePage(pageParam))
  const docs = await col
    .find(filter, { projection: { name: 1, email: 1, role_ids: 1, deleted_at: 1 } })
    .sort({ name: 1 })
    .skip(pagination.skip)
    .limit(pagination.pageSize)
    .toArray()

  const items: UserListItem[] = docs.map((user) => ({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    roleLabel: user.role_ids.map((id) => roleLabelById.get(id.toString())).filter(Boolean).join(', ') || '—',
    isSelf: user._id.toString() === session.userId,
    deletedAt: user.deleted_at,
  }))

  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '6' })}>
      <div className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '3' })}>
        <h1 className={css({ fontSize: '2xl', fontWeight: 'bold', color: 'gray.900', _dark: { color: 'gray.50' } })}>Usuários</h1>
        <div className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4' })}>
          <DeletedToggle pathname="/users" />
          <Link href="/users/new">
            <Button leftIcon={<UserPlus size={18} />}>Novo usuário</Button>
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <p className={emptyCss}>{showDeleted ? 'Nenhum usuário desativado.' : 'Nenhum usuário ativo.'}</p>
      ) : (
        <>
          <div className={css({ display: { base: 'flex', md: 'none' }, flexDir: 'column', gap: '3' })}>
            {items.map((user) => (
              <UserCard key={user.id} user={user} deleted={showDeleted} />
            ))}
          </div>

          <div className={css({ display: { base: 'none', md: 'block' }, bg: 'white', border: '1px solid', borderColor: 'gray.200', borderRadius: 'lg', overflow: 'hidden', _dark: { bg: 'gray.900', borderColor: 'gray.700' } })}>
            <div className={css({ overflowX: 'auto' })}>
              <table className={css({ w: 'full', minW: '600px', borderCollapse: 'collapse' })}>
                <thead>
                  <tr className={css({ bg: 'gray.50', borderBottom: '1px solid', borderColor: 'gray.200', _dark: { bg: 'gray.800', borderColor: 'gray.700' } })}>
                    {TABLE_HEADERS.map((header) => (
                      <th key={header} className={thCss}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((user) => (
                    <UserRow key={user.id} user={user} deleted={showDeleted} activeLabel={activeStatus.label} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <Pagination pathname="/users" params={{ deleted }} pagination={pagination} />
    </div>
  )
}
