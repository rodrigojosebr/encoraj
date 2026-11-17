import { describe, expect, it } from 'vitest'
import type { ObjectId } from 'mongodb'
import { GET as listPackages, POST as createPackageRoute } from '@/app/api/packages/route'
import { GET as getPackage } from '@/app/api/packages/[id]/route'
import { POST as deliver } from '@/app/api/packages/[id]/deliver/route'
import { POST as notify } from '@/app/api/packages/[id]/notify/route'
import { auditLogs, packages, residents } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import {
  createCondo,
  createPackage,
  createResident,
  createUser,
  jsonRequest,
  loginAs,
  photoUrl,
  routeCtx,
} from '../helpers/factory'

async function scenario() {
  const condo = await createCondo()
  const resident = await createResident(condo)
  const porteiro = await createUser(condo, 'porteiro')
  await loginAs(porteiro)
  return { condo, resident, porteiro }
}

const statusOf = async (id: ObjectId) => {
  const doc = await (await packages()).findOne({ _id: id })
  return doc!.status_id.toString()
}

describe('POST /api/packages', () => {
  it('registra a chegada com PIN e token aleatórios, que não voltam na resposta', async () => {
    const { condo, resident, porteiro } = await scenario()

    const res = await createPackageRoute(
      jsonRequest('POST', { resident_id: resident._id.toString(), photo_url: photoUrl(condo), notes: ' frágil ' }),
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(Object.keys(body).sort()).toEqual(['_id', 'code', 'qrcode_url'])

    const doc = (await (await packages()).findOne({ condo_id: condo._id }))!
    expect(doc).toMatchObject({ resident_id: resident._id, arrived_by: porteiro._id, notes: 'frágil' })
    expect(doc.delivery_pin).toMatch(/^\d{6}$/)
    expect(doc.public_token).toMatch(/^[A-Za-z0-9_-]{24}$/)
    expect(doc.public_token).not.toContain(doc._id.toString())
    expect(doc.code).toBe(`PKG-${doc._id.toString().slice(-6).toUpperCase()}`)
    expect(doc.qrcode_url).toContain(`condos/${condo._id.toString()}/packages/qrcodes/${doc._id.toString()}.png`)
    expect(doc.status_id.equals((await getStatus('arrived'))._id)).toBe(true)

    const log = await (await auditLogs()).findOne({ entity_id: doc._id })
    expect(log).toMatchObject({ entity: 'packages', action: 'created' })
    expect(JSON.stringify(log)).not.toContain(doc.delivery_pin!)
  })

  it('PIN e token mudam a cada encomenda', async () => {
    const { condo, resident } = await scenario()
    const body = { resident_id: resident._id.toString(), photo_url: photoUrl(condo) }
    for (let i = 0; i < 5; i++) await createPackageRoute(jsonRequest('POST', body))

    const docs = await (await packages()).find({}).toArray()
    expect(new Set(docs.map((d) => d.public_token)).size).toBe(5)
    expect(new Set(docs.map((d) => d.delivery_pin)).size).toBeGreaterThan(1)
  })

  it('recusa foto que não é do bucket deste condomínio', async () => {
    const { resident } = await scenario()
    const other = await createCondo()

    for (const url of [
      'https://evil.s3.us-east-1.amazonaws.com/x.jpg',
      'https://exemplo.com/foto.jpg',
      photoUrl(other),
      'nao-e-url',
    ]) {
      const res = await createPackageRoute(jsonRequest('POST', { resident_id: resident._id.toString(), photo_url: url }))
      expect(res.status).toBe(400)
    }
    expect(await (await packages()).countDocuments({})).toBe(0)
  })

  it('recusa morador de outro condomínio, morador excluído e id inválido', async () => {
    const { condo, resident } = await scenario()
    const foreign = await createResident(await createCondo())
    const post = (resident_id: string) => createPackageRoute(jsonRequest('POST', { resident_id, photo_url: photoUrl(condo) }))

    expect((await post(foreign._id.toString())).status).toBe(404)
    expect((await post('abc')).status).toBe(400)

    await (await residents()).updateOne({ _id: resident._id }, { $set: { status_id: (await getStatus('deleted'))._id } })
    expect((await post(resident._id.toString())).status).toBe(404)
    expect(await (await packages()).countDocuments({})).toBe(0)
  })
})

describe('GET /api/packages', () => {
  it('lista só o próprio condomínio, sem PIN nem token, com filtro de status', async () => {
    const { condo, resident } = await scenario()
    const mine = await createPackage(condo, resident._id)
    const delivered = await createPackage(condo, resident._id)
    await (await packages()).updateOne({ _id: delivered._id }, { $set: { status_id: (await getStatus('delivered'))._id } })
    const otherCondo = await createCondo()
    await createPackage(otherCondo, (await createResident(otherCondo))._id)

    const all = await (await listPackages(jsonRequest('GET'))).json()
    expect(all).toHaveLength(2)
    expect(JSON.stringify(all)).not.toMatch(/delivery_pin|public_token/)

    const arrived = await (await listPackages(jsonRequest('GET', undefined, {}, 'http://localhost/api/packages?status=arrived'))).json()
    expect(arrived.map((p: { _id: string }) => p._id)).toEqual([mine._id.toString()])

    const invalid = await listPackages(jsonRequest('GET', undefined, {}, 'http://localhost/api/packages?status=active'))
    expect(invalid.status).toBe(400)
  })

  it('detalhe: próprio condomínio sem PIN; outro condomínio → 404', async () => {
    const { condo, resident } = await scenario()
    const mine = await createPackage(condo, resident._id)
    const otherCondo = await createCondo()
    const foreign = await createPackage(otherCondo, (await createResident(otherCondo))._id)

    const res = await getPackage(jsonRequest('GET'), routeCtx(mine._id))
    expect(res.status).toBe(200)
    expect(JSON.stringify(await res.json())).not.toMatch(/delivery_pin|public_token/)

    expect((await getPackage(jsonRequest('GET'), routeCtx(foreign._id))).status).toBe(404)
    expect((await getPackage(jsonRequest('GET'), routeCtx('abc'))).status).toBe(400)
  })
})

describe('POST /api/packages/[id]/deliver', () => {
  const tryDeliver = (id: ObjectId | string, pin?: string) => deliver(jsonRequest('POST', pin === undefined ? {} : { pin }), routeCtx(String(id)))

  it('exige o PIN certo; entrega uma única vez e registra audit log', async () => {
    const { condo, resident, porteiro } = await scenario()
    const pkg = await createPackage(condo, resident._id, { delivery_pin: '654321' })

    expect((await tryDeliver(pkg._id)).status).toBe(400)
    expect((await tryDeliver(pkg._id, '000000')).status).toBe(400)
    expect(await statusOf(pkg._id)).toBe((await getStatus('arrived'))._id.toString())

    expect((await tryDeliver(pkg._id, ' 654321 ')).status).toBe(200)
    const doc = (await (await packages()).findOne({ _id: pkg._id }))!
    expect(doc.status_id.equals((await getStatus('delivered'))._id)).toBe(true)
    expect(doc.delivered_by).toEqual(porteiro._id)
    expect(doc.delivered_at).toBeInstanceOf(Date)

    expect((await tryDeliver(pkg._id, '654321')).status).toBe(409)
    expect(await (await auditLogs()).countDocuments({ entity_id: pkg._id })).toBe(1)
  })

  it('dois porteiros confirmando ao mesmo tempo → só uma entrega', async () => {
    const { condo, resident } = await scenario()
    const pkg = await createPackage(condo, resident._id)

    const results = await Promise.all([tryDeliver(pkg._id, '123456'), tryDeliver(pkg._id, '123456')])
    expect(results.map((r) => r.status).sort()).toEqual([200, 409])
    expect(await (await auditLogs()).countDocuments({ entity_id: pkg._id })).toBe(1)
  })

  it('bloqueia depois de 10 PINs errados, mesmo com o PIN certo', async () => {
    const { condo, resident } = await scenario()
    const pkg = await createPackage(condo, resident._id)
    const other = await createPackage(condo, resident._id)

    for (let i = 0; i < 10; i++) expect((await tryDeliver(pkg._id, '000000')).status).toBe(400)
    expect((await tryDeliver(pkg._id, '123456')).status).toBe(429)
    expect((await tryDeliver(other._id, '123456')).status).toBe(200) // limite é por encomenda
  })

  it('encomenda antiga, sem PIN, é entregue sem código', async () => {
    const { condo, resident } = await scenario()
    const legacy = await createPackage(condo, resident._id, { delivery_pin: null })
    expect((await tryDeliver(legacy._id)).status).toBe(200)
  })

  it('não entrega encomenda de outro condomínio, nem conhecendo o PIN', async () => {
    await scenario()
    const otherCondo = await createCondo()
    const foreign = await createPackage(otherCondo, (await createResident(otherCondo))._id)

    expect((await tryDeliver(foreign._id, '123456')).status).toBe(404)
    expect(await statusOf(foreign._id)).toBe((await getStatus('arrived'))._id.toString())
    expect((await tryDeliver('abc', '123456')).status).toBe(400)
  })
})

describe('POST /api/packages/[id]/notify', () => {
  const tryNotify = (id: ObjectId | string) => notify(jsonRequest('POST'), routeCtx(String(id)))

  it('marca como notificada (pode repetir) e registra audit log', async () => {
    const { condo, resident } = await scenario()
    const pkg = await createPackage(condo, resident._id)

    expect((await tryNotify(pkg._id)).status).toBe(200)
    expect((await tryNotify(pkg._id)).status).toBe(200)

    const doc = (await (await packages()).findOne({ _id: pkg._id }))!
    expect(doc.status_id.equals((await getStatus('notified'))._id)).toBe(true)
    expect(doc.notified_at).toBeInstanceOf(Date)
    expect(await (await auditLogs()).countDocuments({ entity_id: pkg._id })).toBe(2)
  })

  it('nunca "desentrega" uma encomenda já retirada', async () => {
    const { condo, resident } = await scenario()
    const pkg = await createPackage(condo, resident._id)
    const delivered = (await getStatus('delivered'))._id
    await (await packages()).updateOne({ _id: pkg._id }, { $set: { status_id: delivered } })

    expect((await tryNotify(pkg._id)).status).toBe(409)
    expect(await statusOf(pkg._id)).toBe(delivered.toString())
  })

  it('não notifica encomenda de outro condomínio', async () => {
    await scenario()
    const otherCondo = await createCondo()
    const foreign = await createPackage(otherCondo, (await createResident(otherCondo))._id)

    expect((await tryNotify(foreign._id)).status).toBe(404)
    expect(await statusOf(foreign._id)).toBe((await getStatus('arrived'))._id.toString())
    expect((await tryNotify('abc')).status).toBe(400)
  })
})
