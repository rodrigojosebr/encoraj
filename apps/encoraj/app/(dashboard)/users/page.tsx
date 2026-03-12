import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { headers } from 'next/headers'
import { ObjectId } from 'mongodb'
import { users, roles } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { css } from '@/styled-system/css'
import { Badge, Button } from '@encoraj/ui'
import DeleteUserButton from './_components/DeleteUserButton'

export default async function UsersPage() {
  const headersList = await headers()
  const condoId = headersList.get('x-condo-id')!
  const currentUserId = headersList.get('x-user-id')!

  const col = await users()
  const rolesCol = await roles()

  const [{ _id: activeStatusId }, { _id: deletedStatusId }, allRoles] = await Promise.all([
    getStatus('active'),
    getStatus('deleted'),
    rolesCol.find({}).toArray(),
  ])

  // Map role _id → display label (from DB — not hardcoded)
  const roleMap = Object.fromEntries(allRoles.map((r) => [r._id!.toString(), r.label]))

  const docs = await col
    .find({ condo_id: new ObjectId(condoId) })
    .sort({ name: 1 })
    .toArray()

  const active = docs.filter((u) => u.status_id.equals(activeStatusId))
  const deleted = docs.filter((u) => u.status_id.equals(deletedStatusId))

  function UserRow({ u, isDeleted }: { u: (typeof docs)[0]; isDeleted: boolean }) {
    const roleName = roleMap[u.role_id.toString()] ?? '—'
    const isSelf = u._id!.toString() === currentUserId
    return (
      <tr className={css({ borderBottom: '1px solid', borderColor: 'gray.100', _hover: { bg: 'gray.50' }, _dark: { borderColor: 'gray.800', _hover: { bg: 'gray.800' } } })}>
        <td className={css({ px: '4', py: '3', fontSize: 'sm', fontWeight: 'medium', color: isDeleted ? 'gray.400' : 'gray.900', _dark: { color: isDeleted ? 'gray.500' : 'gray.100' } })}>
          {u.name}{isSelf && <span className={css({ ml: '1.5', fontSize: 'xs', color: 'blue.500' })}>(você)</span>}
        </td>
        <td className={css({ px: '4', py: '3', fontSize: 'sm', color: 'gray.600', _dark: { color: 'gray.400' } })}>
          {u.email}
        </td>
        <td className={css({ px: '4', py: '3' })}>
          <Badge status="neutral">{roleName}</Badge>
        </td>
        <td className={css({ px: '4', py: '3', fontSize: 'sm', color: 'gray.600', _dark: { color: 'gray.400' } })}>
          {isDeleted
            ? (u as unknown as { deleted_at?: Date }).deleted_at
              ? new Date((u as unknown as { deleted_at: Date }).deleted_at).toLocaleDateString('pt-BR')
              : '—'
            : <Badge status="arrived">Ativo</Badge>}
        </td>
        <td className={css({ px: '4', py: '3', display: 'flex', gap: '2' })}>
          {!isDeleted && (
            <>
              <Link href={`/users/${u._id!.toString()}/edit`} title="Editar usuário" className={css({
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                w: '8', h: '8', borderRadius: 'md', color: 'gray.400', transition: 'all 0.15s',
                _hover: { color: 'blue.600', bg: 'blue.50' },
                _dark: { color: 'gray.500', _hover: { color: 'blue.400', bg: 'blue.950' } },
              })}>
                <Pencil size={16} />
              </Link>
              {!isSelf && <DeleteUserButton id={u._id!.toString()} name={u.name} />}
            </>
          )}
        </td>
      </tr>
    )
  }

  function UserCard({ u, isDeleted }: { u: (typeof docs)[0]; isDeleted: boolean }) {
    const roleName = roleMap[u.role_id.toString()] ?? '—'
    const isSelf = u._id!.toString() === currentUserId
    return (
      <div className={css({ bg: 'white', border: '1px solid', borderColor: 'gray.200', borderRadius: 'lg', p: '4', display: 'flex', flexDir: 'column', gap: '2', _dark: { bg: 'gray.900', borderColor: 'gray.700' } })}>
        <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' })}>
          <div>
            <p className={css({ fontSize: 'sm', fontWeight: 'semibold', color: isDeleted ? 'gray.400' : 'gray.900', _dark: { color: isDeleted ? 'gray.500' : 'gray.100' } })}>
              {u.name}{isSelf && <span className={css({ ml: '1.5', fontSize: 'xs', color: 'blue.500' })}>(você)</span>}
            </p>
            <p className={css({ fontSize: 'xs', color: 'gray.500', mt: '0.5', _dark: { color: 'gray.400' } })}>{u.email}</p>
          </div>
          <Badge status="neutral">{roleName}</Badge>
        </div>
        {!isDeleted && (
          <div className={css({ display: 'flex', gap: '2' })}>
            <Link href={`/users/${u._id!.toString()}/edit`}>
              <Button variant="ghost" intent="secondary" size="sm">Editar</Button>
            </Link>
            {!isSelf && <DeleteUserButton id={u._id!.toString()} name={u.name} />}
          </div>
        )}
        {isDeleted && (u as unknown as { deleted_at?: Date }).deleted_at && (
          <p className={css({ fontSize: 'xs', color: 'gray.400', _dark: { color: 'gray.500' } })}>
            Desativado em {new Date((u as unknown as { deleted_at: Date }).deleted_at).toLocaleDateString('pt-BR')}
          </p>
        )}
      </div>
    )
  }

  const tableHeaders = ['Nome', 'E-mail', 'Perfil', 'Status', 'Ações']

  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '6' })}>
      {/* Header */}
      <div className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '3' })}>
        <h1 className={css({ fontSize: '2xl', fontWeight: 'bold', color: 'gray.900', _dark: { color: 'gray.50' } })}>
          Usuários
        </h1>
        <Link href="/users/new">
          <Button size="sm">Novo usuário</Button>
        </Link>
      </div>

      {/* Ativos */}
      <div className={css({ display: 'flex', flexDir: 'column', gap: '3' })}>
        <h2 className={css({ fontSize: 'sm', fontWeight: 'semibold', color: 'gray.500', textTransform: 'uppercase', letterSpacing: 'wide', _dark: { color: 'gray.400' } })}>
          Ativos ({active.length})
        </h2>

        {/* Mobile cards */}
        <div className={css({ display: { base: 'flex', md: 'none' }, flexDir: 'column', gap: '3' })}>
          {active.length === 0
            ? <p className={css({ fontSize: 'sm', color: 'gray.500', _dark: { color: 'gray.400' } })}>Nenhum usuário ativo.</p>
            : active.map((u) => <UserCard key={u._id!.toString()} u={u} isDeleted={false} />)
          }
        </div>

        {/* Desktop table */}
        <div className={css({ display: { base: 'none', md: 'block' }, bg: 'white', border: '1px solid', borderColor: 'gray.200', borderRadius: 'lg', overflow: 'hidden', _dark: { bg: 'gray.900', borderColor: 'gray.700' } })}>
          {active.length === 0
            ? <p className={css({ p: '8', textAlign: 'center', color: 'gray.500', fontSize: 'sm', _dark: { color: 'gray.400' } })}>Nenhum usuário ativo.</p>
            : (
              <div className={css({ overflowX: 'auto' })}>
                <table className={css({ w: 'full', minW: '600px', borderCollapse: 'collapse' })}>
                  <thead>
                    <tr className={css({ bg: 'gray.50', borderBottom: '1px solid', borderColor: 'gray.200', _dark: { bg: 'gray.800', borderColor: 'gray.700' } })}>
                      {tableHeaders.map((h) => (
                        <th key={h} className={css({ px: '4', py: '3', textAlign: 'left', fontSize: 'xs', fontWeight: 'semibold', color: 'gray.500', textTransform: 'uppercase', letterSpacing: 'wide', _dark: { color: 'gray.400' } })}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {active.map((u) => <UserRow key={u._id!.toString()} u={u} isDeleted={false} />)}
                  </tbody>
                </table>
              </div>
            )
          }
        </div>
      </div>

      {/* Desativados */}
      {deleted.length > 0 && (
        <div className={css({ display: 'flex', flexDir: 'column', gap: '3' })}>
          <h2 className={css({ fontSize: 'sm', fontWeight: 'semibold', color: 'gray.400', textTransform: 'uppercase', letterSpacing: 'wide', _dark: { color: 'gray.600' } })}>
            Desativados ({deleted.length})
          </h2>

          {/* Mobile cards */}
          <div className={css({ display: { base: 'flex', md: 'none' }, flexDir: 'column', gap: '3' })}>
            {deleted.map((u) => <UserCard key={u._id!.toString()} u={u} isDeleted />)}
          </div>

          {/* Desktop table */}
          <div className={css({ display: { base: 'none', md: 'block' }, bg: 'white', border: '1px solid', borderColor: 'gray.200', borderRadius: 'lg', overflow: 'hidden', opacity: '0.7', _dark: { bg: 'gray.900', borderColor: 'gray.700' } })}>
            <div className={css({ overflowX: 'auto' })}>
              <table className={css({ w: 'full', minW: '600px', borderCollapse: 'collapse' })}>
                <thead>
                  <tr className={css({ bg: 'gray.50', borderBottom: '1px solid', borderColor: 'gray.200', _dark: { bg: 'gray.800', borderColor: 'gray.700' } })}>
                    {tableHeaders.map((h) => (
                      <th key={h} className={css({ px: '4', py: '3', textAlign: 'left', fontSize: 'xs', fontWeight: 'semibold', color: 'gray.500', textTransform: 'uppercase', letterSpacing: 'wide', _dark: { color: 'gray.400' } })}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deleted.map((u) => <UserRow key={u._id!.toString()} u={u} isDeleted />)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
