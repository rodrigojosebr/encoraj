import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ObjectId } from 'mongodb'
import { users, roles } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { css } from '@/styled-system/css'
import UserForm from '../../_components/UserForm'

interface EditUserPageProps {
  params: Promise<{ id: string }>
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  const { id } = await params

  if (!ObjectId.isValid(id)) notFound()

  const col = await users()
  const user = await col.findOne({ _id: new ObjectId(id) })
  if (!user) notFound()

  const rolesCol = await roles()
  const [roleDoc, allRoles, { _id: activeStatusId }] = await Promise.all([
    rolesCol.findOne({ _id: user.role_id }),
    rolesCol.find({ name: { $ne: 'morador' } }).sort({ name: 1 }).toArray(),
    getStatus('active'),
  ])
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
          defaultValues={{
            name: user.name,
            email: user.email,
            role: roleDoc?.name ?? roleOptions[0]?.value ?? '',
          }}
        />
      </div>
    </div>
  )
}
