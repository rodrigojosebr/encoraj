'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@encoraj/ui'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/login')
    router.refresh()
  }

  return (
    <Button variant="ghost" intent="secondary" size="sm" onClick={handleLogout}>
      Sair
    </Button>
  )
}
