import { redirect } from 'next/navigation'
import { readSession } from '@/lib/auth/session'
import { ObjectId } from 'mongodb'
import { users } from '@/lib/db/collections'
import { getRole } from '@/lib/db/status-map'
import { signS3Url } from '@/lib/s3/sign'
import ProfileClient from './_components/ProfileClient'

export default async function ProfilePage() {
  const session = await readSession()
  if (!session) redirect('/api/auth/logout')
  const userId   = session.userId
  const userName = session.userName
  const userRole = session.role
  const condoName = session.condoName

  const col = await users()
  const user = await col.findOne({ _id: new ObjectId(userId) }, { projection: { email: 1, photo_url: 1 } })

  const roleLabel = await getRole(userRole).then(r => r.label).catch(() => userRole)

  return (
    <ProfileClient
      name={userName}
      email={user?.email ?? ''}
      roleLabel={roleLabel}
      condoName={condoName}
      isAdmin={userRole === 'admin'}
      userId={userId}
      photoUrl={await signS3Url(user?.photo_url)}
    />
  )
}
