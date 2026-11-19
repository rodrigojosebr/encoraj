import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST as reportFromScreen } from '@/app/api/client-errors/route'
import { errorLogs } from '@/lib/db/collections'
import { createCondo, createUser, jsonRequest, loginAs } from '../helpers/factory'

const send = (body: unknown) => reportFromScreen(jsonRequest('POST', body))

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('POST /api/client-errors', () => {
  it('registra e alerta o erro da tela, com quem viu e onde', async () => {
    const user = await createUser(await createCondo(), 'porteiro')
    await loginAs(user)

    const res = await send({ message: 'Cannot read properties of null', digest: '123456789', path: '/packages/new?x=1' })
    expect(res.status).toBe(204)

    expect(console.error).toHaveBeenCalledWith('[tela]', expect.objectContaining({ message: 'Cannot read properties of null' }))
    const doc = (await (await errorLogs()).findOne({ label: '[tela]' }))!
    expect(doc).toMatchObject({
      message: 'Cannot read properties of null',
      count: 1,
      extra: {
        digest: '123456789',
        path: '/packages/new', // sem a query string
        roles: 'porteiro',
        condoId: user.condo._id.toString(),
        userId: user._id.toString(),
      },
    })
    expect(JSON.stringify(doc)).not.toContain(user.name)
    expect(JSON.stringify(doc)).not.toContain(user.email)
  })

  it('recusa corpo inválido ou grande demais', async () => {
    await loginAs(await createUser(await createCondo(), 'admin'))

    expect((await send(undefined)).status).toBe(400)
    expect((await send({})).status).toBe(400)
    expect((await send({ message: '   ' })).status).toBe(400)
    expect((await send({ message: 'x'.repeat(501) })).status).toBe(400)
    expect((await send({ message: 'ok', path: 'p'.repeat(201) })).status).toBe(400)
    expect(await (await errorLogs()).countDocuments({})).toBe(0)
  })

  it('limita relatos por usuário, sem afetar os outros', async () => {
    const condo = await createCondo()
    const [noisy, quiet] = [await createUser(condo, 'porteiro'), await createUser(condo, 'zelador')]

    await loginAs(noisy)
    for (let i = 0; i < 10; i++) expect((await send({ message: `erro ${i}` })).status).toBe(204)
    expect((await send({ message: 'erro 11' })).status).toBe(429)

    await loginAs(quiet)
    expect((await send({ message: 'erro do colega' })).status).toBe(204)
  })
})
