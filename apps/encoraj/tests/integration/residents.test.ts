import { describe, expect, it } from 'vitest'
import { GET as listResidents, POST as createResidentRoute } from '@/app/api/residents/route'
import { PUT as updateResident, PATCH as restoreResident, DELETE as deleteResident } from '@/app/api/residents/[id]/route'
import { GET as getCondo, PUT as updateCondo } from '@/app/api/condo/route'
import { auditLogs, condominiums, residents } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { verifyToken } from '@/lib/auth/jwt'
import { AUTH_COOKIE } from '@/lib/auth/cookies'
import { createCondo, createResident, createUser, jsonRequest, loginAs, routeCtx } from '../helpers/factory'

const search = (q = '') => listResidents(jsonRequest('GET', undefined, {}, `http://localhost/api/residents?q=${encodeURIComponent(q)}`))
const names = async (res: Response) => ((await res.json()) as Array<{ name: string }>).map((r) => r.name)

describe('GET /api/residents', () => {
  it('devolve só moradores ativos do próprio condomínio', async () => {
    const [a, b] = [await createCondo(), await createCondo()]
    await createResident(a, 'Ana')
    const gone = await createResident(a, 'Bruno')
    await createResident(b, 'Carla do outro condomínio')
    await (await residents()).updateOne({ _id: gone._id }, { $set: { status_id: (await getStatus('deleted'))._id } })

    await loginAs(await createUser(a, 'porteiro'))
    expect(await names(await search())).toEqual(['Ana'])
  })

  it('busca por nome ou apartamento, tratando o texto como literal', async () => {
    const condo = await createCondo()
    await createResident(condo, 'Maria')
    await createResident(condo, 'João (síndico)')
    await loginAs(await createUser(condo, 'zelador'))

    expect(await names(await search('mar'))).toEqual(['Maria'])
    expect(await names(await search('101'))).toHaveLength(2)
    expect(await names(await search('.*'))).toEqual([]) // regex não é interpretado
    expect(await names(await search('(síndico)'))).toEqual(['João (síndico)']) // e não quebra a query
  })
})

describe('POST /api/residents', () => {
  it('cria no condomínio da sessão, ignorando condo_id enviado no corpo', async () => {
    const [a, b] = [await createCondo(), await createCondo()]
    const zelador = await createUser(a, 'zelador')
    await loginAs(zelador)

    const res = await createResidentRoute(
      jsonRequest('POST', { name: 'Ana', apartment: '12', whatsapp: '+5511999990000', condo_id: b._id.toString() }),
    )
    expect(res.status).toBe(201)

    const doc = await (await residents()).findOne({ name: 'Ana' })
    expect(doc).toMatchObject({ condo_id: a._id, created_by: zelador._id })
    expect(await (await auditLogs()).countDocuments({ entity: 'residents', entity_id: doc!._id, action: 'created' })).toBe(1)
  })

  it('dados inválidos → 400', async () => {
    await loginAs(await createUser(await createCondo(), 'admin'))
    expect((await createResidentRoute(jsonRequest('POST', { name: 'A', apartment: '', whatsapp: '' }))).status).toBe(400)
  })
})

describe('/api/residents/[id]', () => {
  it('edita, exclui (soft) e restaura dentro do próprio condomínio', async () => {
    const condo = await createCondo()
    const resident = await createResident(condo, 'Ana')
    const admin = await createUser(condo, 'admin')
    await loginAs(admin)
    const find = async () => (await (await residents()).findOne({ _id: resident._id }))!

    expect((await updateResident(jsonRequest('PUT', { apartment: '202' }), routeCtx(resident._id))).status).toBe(200)
    expect(await find()).toMatchObject({ name: 'Ana', apartment: '202' })

    expect((await deleteResident(jsonRequest('DELETE'), routeCtx(resident._id))).status).toBe(200)
    expect((await find()).status_id.equals((await getStatus('deleted'))._id)).toBe(true)
    expect((await find()).deleted_by).toEqual(admin._id)
    expect((await updateResident(jsonRequest('PUT', { apartment: '303' }), routeCtx(resident._id))).status).toBe(404)

    expect((await restoreResident(jsonRequest('PATCH'), routeCtx(resident._id))).status).toBe(200)
    const restored = await find()
    expect(restored.status_id.equals((await getStatus('active'))._id)).toBe(true)
    expect(restored.deleted_at).toBeUndefined()
    expect(restored.deleted_by).toBeUndefined()

    expect(await (await auditLogs()).countDocuments({ entity_id: resident._id })).toBe(3)
  })

  it('não toca em morador de outro condomínio', async () => {
    const foreign = await createResident(await createCondo(), 'Do Outro')
    await loginAs(await createUser(await createCondo(), 'admin'))

    expect((await updateResident(jsonRequest('PUT', { name: 'Invadido' }), routeCtx(foreign._id))).status).toBe(404)
    expect((await deleteResident(jsonRequest('DELETE'), routeCtx(foreign._id))).status).toBe(404)
    expect((await restoreResident(jsonRequest('PATCH'), routeCtx(foreign._id))).status).toBe(404)

    const doc = await (await residents()).findOne({ _id: foreign._id })
    expect(doc).toMatchObject({ name: 'Do Outro' })
    expect(doc!.status_id.equals((await getStatus('active'))._id)).toBe(true)
    expect(await (await auditLogs()).countDocuments({})).toBe(0)
  })

  it('id malformado → 400', async () => {
    await loginAs(await createUser(await createCondo(), 'admin'))
    expect((await updateResident(jsonRequest('PUT', {}), routeCtx('xyz'))).status).toBe(400)
    expect((await deleteResident(jsonRequest('DELETE'), routeCtx('xyz'))).status).toBe(400)
    expect((await restoreResident(jsonRequest('PATCH'), routeCtx('xyz'))).status).toBe(400)
  })
})

describe('/api/condo', () => {
  it('GET devolve o condomínio da sessão', async () => {
    const condo = await createCondo('Edifício Lua')
    await createCondo('Outro')
    await loginAs(await createUser(condo, 'sindico'))
    expect(await (await getCondo()).json()).toMatchObject({ name: 'Edifício Lua' })
  })

  it('PUT renomeia só o próprio condomínio, registra audit log e atualiza o cookie', async () => {
    const [mine, other] = [await createCondo('Antigo'), await createCondo('Outro')]
    const admin = await createUser(mine, 'admin')
    await loginAs(admin)

    const res = await updateCondo(jsonRequest('PUT', { name: 'Novo Nome' }))
    expect(res.status).toBe(200)

    expect((await (await condominiums()).findOne({ _id: mine._id }))!.name).toBe('Novo Nome')
    expect((await (await condominiums()).findOne({ _id: other._id }))!.name).toBe('Outro')
    expect(await (await auditLogs()).findOne({ entity_id: mine._id })).toMatchObject({
      entity: 'condominiums',
      before: { name: 'Antigo' },
      after: { name: 'Novo Nome' },
    })
    expect((await verifyToken(res.cookies.get(AUTH_COOKIE)!.value)).condo_name).toBe('Novo Nome')
    expect((await updateCondo(jsonRequest('PUT', { name: 'x' }))).status).toBe(400)
  })
})
