import { headers } from 'next/headers'
import { ObjectId } from 'mongodb'
import { users } from '@/lib/db/collections'
import { getRole } from '@/lib/db/status-map'
import ProfileClient from './_components/ProfileClient'

export default async function ProfilePage() {
  const headersList = await headers()
  const userId   = headersList.get('x-user-id')!
  const userName = headersList.get('x-user-name') ?? ''
  const userRole = headersList.get('x-user-role') ?? ''
  const condoName = headersList.get('x-condo-name') ?? ''

  const col = await users()
  const user = await col.findOne({ _id: new ObjectId(userId) })

  const roleLabel = await getRole(userRole).then(r => r.label).catch(() => userRole)

  return (
    <ProfileClient
      name={userName}
      email={user?.email ?? ''}
      roleLabel={roleLabel}
      condoName={condoName}
      isAdmin={userRole === 'admin'}
      userId={userId}
      photoUrl={user?.photo_url ?? null}
    />
  )
}
