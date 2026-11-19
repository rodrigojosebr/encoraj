import { redirect } from 'next/navigation'
import { readSession } from '@/lib/auth/session'
import { ObjectId } from 'mongodb'
import { users } from '@/lib/db/collections'
import { can } from '@/lib/auth/permissions'
import { roleLabels } from '@/lib/auth/user-roles'
import { signS3Url } from '@/lib/s3/sign'
import ProfileClient from './_components/ProfileClient'

export default async function ProfilePage() {
  const session = await readSession()
  if (!session) redirect('/api/auth/logout')
  const userId   = session.userId
  const userName = session.userName
  const condoName = session.condoName

  const col = await users()
  const user = await col.findOne({ _id: new ObjectId(userId) }, { projection: { email: 1, photo_url: 1 } })

  const roleLabel = await roleLabels(session.roles)

  return (
    <ProfileClient
      name={userName}
      email={user?.email ?? ''}
      roleLabel={roleLabel}
      condoName={condoName}
      isAdmin={can(session, 'users.manage')}
      userId={userId}
      photoUrl={await signS3Url(user?.photo_url)}
    />
  )
}
