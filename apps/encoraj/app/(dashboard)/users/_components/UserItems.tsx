import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { Badge, Button } from '@encoraj/ui'
import { css } from '@/styled-system/css'
import { fmtDate } from '@/lib/date/tz'
import DeleteUserButton from './DeleteUserButton'

/** O que a lista de usuários mostra de cada um — montado no servidor, já com os rótulos do banco. */
export interface UserListItem {
  id: string
  name: string
  email: string
  /** "Administrador, Porteiro" */
  roleLabel: string
  isSelf: boolean
  deletedAt?: Date
}

const youCss = css({ ml: '1.5', fontSize: 'xs', color: 'blue.500' })
const nameCss = (deleted: boolean) =>
  css({ fontSize: 'sm', fontWeight: 'medium', color: deleted ? 'gray.400' : 'gray.900', _dark: { color: deleted ? 'gray.500' : 'gray.100' } })
const mutedCss = css({ fontSize: 'sm', color: 'gray.600', _dark: { color: 'gray.400' } })

function UserName({ user, deleted }: { user: UserListItem; deleted: boolean }) {
  return (
    <span className={nameCss(deleted)}>
      {user.name}
      {user.isSelf && <span className={youCss}>(você)</span>}
    </span>
  )
}

/** Linha da tabela (desktop). */
export function UserRow({ user, deleted, activeLabel }: { user: UserListItem; deleted: boolean; activeLabel: string }) {
  return (
    <tr className={css({ borderBottom: '1px solid', borderColor: 'gray.100', _hover: { bg: 'gray.50' }, _dark: { borderColor: 'gray.800', _hover: { bg: 'gray.800' } } })}>
      <td className={css({ px: '4', py: '3' })}>
        <UserName user={user} deleted={deleted} />
      </td>
      <td className={css({ px: '4', py: '3' })}>
        <span className={mutedCss}>{user.email}</span>
      </td>
      <td className={css({ px: '4', py: '3' })}>
        <Badge status="neutral">{user.roleLabel}</Badge>
      </td>
      <td className={css({ px: '4', py: '3' })}>
        {deleted ? <span className={mutedCss}>{user.deletedAt ? fmtDate(user.deletedAt) : '—'}</span> : <Badge status="arrived">{activeLabel}</Badge>}
      </td>
      <td className={css({ px: '4', py: '3', display: 'flex', gap: '2' })}>
        {!deleted && (
          <>
            <Link
              href={`/users/${user.id}/edit`}
              title="Editar usuário"
              className={css({
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                w: '8',
                h: '8',
                borderRadius: 'md',
                color: 'gray.400',
                transition: 'all 0.15s',
                _hover: { color: 'blue.600', bg: 'blue.50' },
                _dark: { color: 'gray.500', _hover: { color: 'blue.400', bg: 'blue.950' } },
              })}
            >
              <Pencil size={16} />
            </Link>
            {!user.isSelf && <DeleteUserButton id={user.id} name={user.name} />}
          </>
        )}
      </td>
    </tr>
  )
}

/** Cartão (mobile). */
export function UserCard({ user, deleted }: { user: UserListItem; deleted: boolean }) {
  return (
    <div className={css({ bg: 'white', border: '1px solid', borderColor: 'gray.200', borderRadius: 'lg', p: '4', display: 'flex', flexDir: 'column', gap: '2', _dark: { bg: 'gray.900', borderColor: 'gray.700' } })}>
      <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '2' })}>
        <div>
          <UserName user={user} deleted={deleted} />
          <p className={css({ fontSize: 'xs', color: 'gray.500', mt: '0.5', _dark: { color: 'gray.400' } })}>{user.email}</p>
        </div>
        <Badge status="neutral">{user.roleLabel}</Badge>
      </div>
      {!deleted && (
        <div className={css({ display: 'flex', gap: '2' })}>
          <Link href={`/users/${user.id}/edit`}>
            <Button variant="ghost" intent="secondary" size="sm">
              Editar
            </Button>
          </Link>
          {!user.isSelf && <DeleteUserButton id={user.id} name={user.name} />}
        </div>
      )}
      {deleted && user.deletedAt && (
        <p className={css({ fontSize: 'xs', color: 'gray.400', _dark: { color: 'gray.500' } })}>Desativado em {fmtDate(user.deletedAt)}</p>
      )}
    </div>
  )
}
