import { describe, expect, it } from 'vitest'
import { getSession, readSession } from '@/lib/auth/session'
import { users } from '@/lib/db/collections'
import { getRole, getStatus } from '@/lib/db/status-map'
import { AUTH_COOKIE } from '@/lib/auth/cookies'
import { checkRateLimit, clearRateLimit, isRateLimited } from '@/lib/auth/rateLimit'
import { rateLimits } from '@/lib/db/collections'
import { createCondo, createUser, loginAs, logout } from '../helpers/factory'
import { requestState } from '../helpers/request-state'

describe('getSession', () => {
  it('sem cookie → null', async () => {
    expect(await readSession()).toBeNull()
    expect(await getSession()).toBeNull()
  })

  it('cookie inválido → null', async () => {
    requestState.cookies.set(AUTH_COOKIE, 'lixo')
    expect(await getSession()).toBeNull()
  })

  it('header de identidade forjado não vale nada', async () => {
    const admin = await createUser(await createCondo(), 'admin')
    requestState.headers.set('x-user-id', admin._id.toString())
    requestState.headers.set('x-user-role', 'admin')
    requestState.headers.set('x-condo-id', admin.condo._id.toString())
    expect(await getSession()).toBeNull()
  })

  it('usuário ativo → sessão com os dados do token', async () => {
    const user = await createUser(await createCondo('Condomínio Ação'), 'porteiro', { name: 'José' })
    await loginAs(user)
    expect(await getSession()).toEqual({
      userId: user._id.toString(),
      userName: 'José',
      roles: ['porteiro'],
      condoId: user.condo._id.toString(),
      condoName: 'Condomínio Ação',
    })
  })

  it('usuário desativado perde a sessão na hora', async () => {
    const user = await createUser(await createCondo(), 'zelador')
    await loginAs(user)
    await (await users()).updateOne(
      { _id: user._id },
      { $set: { status_id: (await getStatus('deleted'))._id } },
    )
    expect(await getSession()).toBeNull()
    expect(await readSession()).not.toBeNull() // o token em si ainda é válido — por isso o getSession existe
  })

  it('role alterado invalida o token antigo', async () => {
    const user = await createUser(await createCondo(), 'admin')
    await loginAs(user)
    await (await users()).updateOne(
      { _id: user._id },
      { $set: { role_ids: [(await getRole('porteiro'))._id] } },
    )
    expect(await getSession()).toBeNull()
  })

  it('várias roles: a sessão traz todas, em qualquer ordem', async () => {
    const user = await createUser(await createCondo(), ['zelador', 'porteiro'])
    await loginAs({ ...user, roles: ['porteiro', 'zelador'] })
    expect((await getSession())!.roles.sort()).toEqual(['porteiro', 'zelador'])
  })

  it('ganhar ou perder UMA role invalida o token antigo', async () => {
    const user = await createUser(await createCondo(), ['zelador', 'porteiro'])
    const ids = { zelador: (await getRole('zelador'))._id, porteiro: (await getRole('porteiro'))._id, admin: (await getRole('admin'))._id }

    await loginAs(user)
    await (await users()).updateOne({ _id: user._id }, { $set: { role_ids: [ids.zelador] } })
    expect(await getSession()).toBeNull() // perdeu porteiro

    await (await users()).updateOne({ _id: user._id }, { $set: { role_ids: [ids.zelador, ids.porteiro, ids.admin] } })
    expect(await getSession()).toBeNull() // ganhou admin: token antigo não vira admin sozinho
  })

  it('token que afirma uma role que o banco não deu é recusado', async () => {
    const user = await createUser(await createCondo(), 'porteiro')
    await loginAs({ ...user, roles: ['porteiro', 'admin'] })
    expect(await getSession()).toBeNull()
  })

  it('usuário sem nenhuma role não tem sessão', async () => {
    const user = await createUser(await createCondo(), 'porteiro')
    await loginAs(user)
    await (await users()).updateOne({ _id: user._id }, { $set: { role_ids: [] } })
    expect(await getSession()).toBeNull()
  })

  it('usuário movido de condomínio invalida o token antigo', async () => {
    const user = await createUser(await createCondo(), 'zelador')
    const other = await createCondo()
    await loginAs(user)
    await (await users()).updateOne({ _id: user._id }, { $set: { condo_id: other._id } })
    expect(await getSession()).toBeNull()
  })

  it('senha trocada depois do login invalida o token; antes, não', async () => {
    const user = await createUser(await createCondo(), 'admin')
    await loginAs(user)

    await (await users()).updateOne(
      { _id: user._id },
      { $set: { password_changed_at: new Date(Date.now() - 60_000) } },
    )
    expect(await getSession()).not.toBeNull()

    await (await users()).updateOne(
      { _id: user._id },
      { $set: { password_changed_at: new Date(Date.now() + 60_000) } },
    )
    expect(await getSession()).toBeNull()
  })

  it('usuário apagado do banco → null', async () => {
    const user = await createUser(await createCondo(), 'admin')
    await loginAs(user)
    await (await users()).deleteOne({ _id: user._id })
    expect(await getSession()).toBeNull()
    logout()
    expect(await readSession()).toBeNull()
  })
})

describe('rate limit', () => {
  const WINDOW = 60_000

  it('bloqueia só depois de estourar o máximo', async () => {
    for (let i = 1; i <= 3; i++) {
      const result = await checkRateLimit('k', 3, WINDOW)
      expect(result).toMatchObject({ blocked: false, remaining: 3 - i })
    }
    const blocked = await checkRateLimit('k', 3, WINDOW)
    expect(blocked.blocked).toBe(true)
    expect(blocked.retryAfter).toBeInstanceOf(Date)
  })

  it('chaves são independentes', async () => {
    await checkRateLimit('a', 1, WINDOW)
    await checkRateLimit('a', 1, WINDOW)
    expect((await checkRateLimit('b', 1, WINDOW)).blocked).toBe(false)
  })

  it('isRateLimited consulta sem incrementar', async () => {
    expect(await isRateLimited('k', 2)).toBe(false)
    await checkRateLimit('k', 2, WINDOW)
    expect(await isRateLimited('k', 2)).toBe(false)
    await checkRateLimit('k', 2, WINDOW)
    expect(await isRateLimited('k', 2)).toBe(true)
    expect(await isRateLimited('k', 2)).toBe(true)
    expect((await (await rateLimits()).findOne({ key: 'k' }))?.attempts).toBe(2)
  })

  it('clearRateLimit zera', async () => {
    await checkRateLimit('k', 1, WINDOW)
    await clearRateLimit('k')
    expect(await isRateLimited('k', 1)).toBe(false)
  })

  it('janela vencida não conta, mesmo que o TTL ainda não tenha limpado', async () => {
    await (await rateLimits()).insertOne({ key: 'k', attempts: 99, reset_at: new Date(Date.now() - 1000) })
    expect(await isRateLimited('k', 1)).toBe(false)
    expect(await checkRateLimit('k', 5, WINDOW)).toMatchObject({ blocked: false, remaining: 4 })
  })
})
