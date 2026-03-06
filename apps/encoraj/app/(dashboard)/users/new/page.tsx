import Link from 'next/link'
import { roles } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { css } from '@/styled-system/css'
import UserForm from '../_components/UserForm'

export default async function NewUserPage() {
  const [{ _id: activeStatusId }, rolesCol] = await Promise.all([
    getStatus('active'),
    roles(),
  ])
  const allRoles = await rolesCol
    .find({ status_id: activeStatusId, name: { $ne: 'morador' } })
    .sort({ name: 1 })
    .toArray()
  const roleOptions = allRoles.map((r) => ({ value: r.name, label: r.label }))

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
          Novo usuário
        </h1>
      </div>

      <div className={css({ bg: 'white', border: '1px solid', borderColor: 'gray.200', borderRadius: 'lg', p: { base: '4', md: '6' }, _dark: { bg: 'gray.900', borderColor: 'gray.700' } })}>
        <UserForm roleOptions={roleOptions} />
      </div>
    </div>
  )
}
