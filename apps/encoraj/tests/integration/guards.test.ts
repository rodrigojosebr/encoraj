import { describe, expect, it } from 'vitest'
import { users } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { ALL_ROLES, createCondo, createUser, loginAs } from '../helpers/factory'
import { PROTECTED_ROUTES } from '../helpers/routes'

describe.each(PROTECTED_ROUTES)('$name', ({ call, roles }) => {
  it('sem sessão → 401', async () => {
    expect((await call()).status).toBe(401)
  })

  it('usuário desativado com token ainda válido → 401', async () => {
    const user = await createUser(await createCondo(), 'admin')
    await loginAs(user)
    await (await users()).updateOne({ _id: user._id }, { $set: { status_id: (await getStatus('deleted'))._id } })
    expect((await call()).status).toBe(401)
  })

  it.each(ALL_ROLES)('role %s', async (role) => {
    await loginAs(await createUser(await createCondo(), role))
    const { status } = await call()

    if (roles.includes(role)) {
      // passou pela guarda: pode dar 400/404 pelo corpo vazio, nunca 401/403
      expect([401, 403]).not.toContain(status)
    } else {
      expect(status).toBe(403)
    }
  })
})
