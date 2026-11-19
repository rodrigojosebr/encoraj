import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ObjectId } from 'mongodb'
import { users, roles } from '@/lib/db/collections'
import { readSession } from '@/lib/auth/session'
import { canManageUserWith, UNASSIGNABLE_ROLES } from '@/lib/auth/roles'
import { userRoleNames } from '@/lib/auth/user-roles'
import { getStatus } from '@/lib/db/status-map'
import { css } from '@/styled-system/css'
import { can } from '@/lib/auth/permissions'
import UserForm from '../../_components/UserForm'

interface EditUserPageProps {
  params: Promise<{ id: string }>
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  const { id } = await params

  if (!ObjectId.isValid(id)) notFound()

  const session = await readSession()
  if (!session) notFound()
  if (!can(session, 'users.manage')) notFound()

  const col = await users()
  const user = await col.findOne(
    { _id: new ObjectId(id), condo_id: new ObjectId(session.condoId) },
    { projection: { password_hash: 0 } },
  )
  if (!user) notFound()

  const rolesCol = await roles()
  const [userRoles, allRoles, { _id: activeStatusId }] = await Promise.all([
    userRoleNames(user),
    rolesCol.find({ name: { $nin: UNASSIGNABLE_ROLES } }).sort({ name: 1 }).toArray(),
    getStatus('active'),
  ])

  // Ninguém edita quem está acima — super admin, admin da administradora (a API recusa do mesmo jeito)
  if (!canManageUserWith(session, userRoles)) notFound()

  const roleOptions = allRoles
    .filter((r) => r.status_id.equals(activeStatusId))
    .map((r) => ({ value: r.name, label: r.label }))

  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '6' })}>
      <div>
        <Link
          href="/users"
          className={css({ fontSize: 'sm', color: 'blue.600', textDecoration: 'none', _hover: { textDecoration: 'underline' }, _dark: { color: 'blue.400' } })}
        >
          ← Usuários
        </Link>
        <h1 className={css({ fontSize: '2xl', fontWeight: 'bold', color: 'gray.900', mt: '2', _dark: { color: 'gray.50' } })}>
          Editar usuário
        </h1>
      </div>

      <div className={css({ bg: 'white', border: '1px solid', borderColor: 'gray.200', borderRadius: 'lg', p: { base: '4', md: '6' }, _dark: { bg: 'gray.900', borderColor: 'gray.700' } })}>
        <UserForm
          id={id}
          roleOptions={roleOptions}
          rolesOptional={userRoles.some((name) => UNASSIGNABLE_ROLES.includes(name))}
          defaultValues={{
            name: user.name,
            email: user.email,
            // só as roles que a tela atribui; superadmin e administradora ficam como estão no banco
            roles: userRoles.filter((name) => roleOptions.some((option) => option.value === name)),
          }}
        />
      </div>
    </div>
  )
}
