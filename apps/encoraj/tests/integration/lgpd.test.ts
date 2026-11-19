import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { ObjectId } from 'mongodb'
import { DELETE as eraseResidentRoute } from '@/app/api/residents/[id]/erase/route'
import { DELETE as eraseUserRoute } from '@/app/api/users/[id]/erase/route'
import { DELETE as eraseCondoRoute } from '@/app/api/condo/erase/route'
import { GET as getCondo } from '@/app/api/condo/route'
import { s3 } from '@/lib/s3/client'
import { ERASE_CONFIRMATION, ERASED_ACTOR_NAME } from '@/lib/lgpd/erase'
import { getStatus } from '@/lib/db/status-map'
import { logAction } from '@/lib/audit/log'
import {
  auditLogs,
  condominiums,
  packages,
  passwordResetTokens,
  residents,
  users,
} from '@/lib/db/collections'
import { getSession } from '@/lib/auth/session'
import { AUTH_COOKIE } from '@/lib/auth/cookies'
import {
  createCondo,
  createPackage,
  createResident,
  createUser,
  jsonRequest,
  loginAs,
  PASSWORD,
  routeCtx,
  type TestCondo,
} from '../helpers/factory'
import { requestState } from '../helpers/request-state'

const BASE = 'https://test-bucket.s3.us-east-1.amazonaws.com/'
const CONFIRM = { confirm: ERASE_CONFIRMATION }
const send = vi.mocked(s3.send) as unknown as ReturnType<typeof vi.fn>

/** Chaves que foram mandadas apagar no S3 nesta execução */
const deletedKeys = () =>
  send.mock.calls
    .map(([command]) => command)
    .filter((command): command is DeleteObjectsCommand => command instanceof DeleteObjectsCommand)
    .flatMap((command) => command.input.Delete!.Objects!.map((o) => o.Key))
    .sort()

beforeEach(() => {
  send.mockReset()
  send.mockResolvedValue({})
})

/** Encomenda com fotos "de verdade" no bucket e dados pessoais em todos os campos */
async function packageWithData(condo: TestCondo, residentId: ObjectId, n: number) {
  const pkg = await createPackage(condo, residentId)
  const photo_url = `${BASE}condos/${condo._id.toString()}/packages/photos/foto-${n}.jpg`
  const qrcode_url = `${BASE}condos/${condo._id.toString()}/packages/qrcodes/${pkg._id.toString()}.png`
  await (await packages()).updateOne({ _id: pkg._id }, { $set: { photo_url, qrcode_url, notes: 'Deixar com a filha' } })
  await logAction({
    condo_id: condo._id,
    entity: 'packages',
    entity_id: pkg._id,
    action: 'created',
    actor_id: new ObjectId(),
    actor_name: 'Porteiro',
    after: { photo_url, notes: 'Deixar com a filha' },
  })
  return pkg
}

async function markDelivered(...ids: ObjectId[]) {
  await (await packages()).updateMany(
    { _id: { $in: ids } },
    { $set: { status_id: (await getStatus('delivered'))._id, delivered_at: new Date() } },
  )
}

describe('DELETE /api/residents/[id]/erase', () => {
  it('apaga o morador, as fotos no S3 e todo dado pessoal — e preserva o resto', async () => {
    const condo = await createCondo()
    const admin = await createUser(condo, 'admin')
    const ana = await createResident(condo, 'Ana Souza')
    const bia = await createResident(condo, 'Bia Lima')
    const [a1, a2] = [await packageWithData(condo, ana._id, 1), await packageWithData(condo, ana._id, 2)]
    await markDelivered(a1._id, a2._id) // só se remove quem não tem nada pendente
    const b1 = await packageWithData(condo, bia._id, 3)
    await logAction({
      condo_id: condo._id,
      entity: 'residents',
      entity_id: ana._id,
      action: 'created',
      actor_id: admin._id,
      actor_name: admin.name,
      after: { name: 'Ana Souza', whatsapp: '+5511999990000' },
    })
    await loginAs(admin)

    const res = await eraseResidentRoute(jsonRequest('DELETE', CONFIRM), routeCtx(ana._id))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, packages: 2, files: 4 })

    // S3: só os 4 arquivos da Ana
    const prefix = `condos/${condo._id.toString()}/packages/`
    expect(deletedKeys()).toEqual(
      [
        `${prefix}photos/foto-1.jpg`,
        `${prefix}photos/foto-2.jpg`,
        `${prefix}qrcodes/${a1._id.toString()}.png`,
        `${prefix}qrcodes/${a2._id.toString()}.png`,
      ].sort(),
    )

    // Banco: cadastro some; encomendas ficam, anônimas
    expect(await (await residents()).findOne({ _id: ana._id })).toBeNull()
    for (const id of [a1._id, a2._id]) {
      const pkg = (await (await packages()).findOne({ _id: id }))!
      expect(pkg).toMatchObject({ photo_url: '', qrcode_url: '', code: expect.stringMatching(/^PKG-/) })
      expect(pkg.notes).toBeUndefined()
      expect(pkg.delivery_pin).toBeUndefined()
      expect(pkg.public_token).toBeUndefined()
    }

    // Auditoria: os registros continuam (quem, quando), o conteúdo sai
    const logs = await (await auditLogs()).find({ condo_id: condo._id }).toArray()
    expect(JSON.stringify(logs)).not.toMatch(/Ana Souza|5511999990000|foto-1|foto-2/)
    expect(logs.filter((l) => l.entity_id.equals(ana._id)).map((l) => l.action).sort()).toEqual(['created', 'deleted'])
    expect(logs.find((l) => l.entity_id.equals(ana._id) && l.action === 'deleted')).toMatchObject({
      actor_id: admin._id,
      after: { erased: true, packages: 2, files: 4 },
    })

    // A Bia não é tocada
    expect((await (await residents()).findOne({ _id: bia._id }))!.name).toBe('Bia Lima')
    expect(await (await packages()).findOne({ _id: b1._id })).toMatchObject({
      notes: 'Deixar com a filha',
      delivery_pin: '123456',
      photo_url: expect.stringContaining('foto-3.jpg'),
    })
    expect(JSON.stringify(logs)).toContain('foto-3')
  })

  it('recusa enquanto houver encomenda aguardando retirada — e não apaga nada', async () => {
    const condo = await createCondo()
    const ana = await createResident(condo, 'Ana Souza')
    const delivered = await packageWithData(condo, ana._id, 1)
    const arrived = await packageWithData(condo, ana._id, 2)
    const notified = await packageWithData(condo, ana._id, 3)
    await markDelivered(delivered._id)
    await (await packages()).updateOne({ _id: notified._id }, { $set: { status_id: (await getStatus('notified'))._id } })
    await loginAs(await createUser(condo, 'admin'))
    const erase = () => eraseResidentRoute(jsonRequest('DELETE', CONFIRM), routeCtx(ana._id))

    const blocked = await erase()
    expect(blocked.status).toBe(409)
    expect(await blocked.json()).toMatchObject({ pending: 2, error: expect.stringContaining('2 encomenda(s)') })

    // nada foi tocado: cadastro, PIN, fotos e S3 intactos
    expect((await (await residents()).findOne({ _id: ana._id }))!.name).toBe('Ana Souza')
    for (const pkg of [delivered, arrived, notified]) {
      expect(await (await packages()).findOne({ _id: pkg._id })).toMatchObject({ delivery_pin: '123456', notes: 'Deixar com a filha' })
    }
    expect(send).not.toHaveBeenCalled()
    expect(await (await auditLogs()).countDocuments({ action: 'deleted' })).toBe(0)

    // retiradas concluídas → agora remove
    await markDelivered(arrived._id, notified._id)
    const done = await erase()
    expect(done.status).toBe(200)
    expect(await done.json()).toMatchObject({ ok: true, packages: 3 })
    expect(await (await residents()).findOne({ _id: ana._id })).toBeNull()
  })

  it('também remove morador que já estava excluído (soft-delete)', async () => {
    const condo = await createCondo()
    const resident = await createResident(condo)
    await (await residents()).updateOne({ _id: resident._id }, { $set: { deleted_at: new Date() } })
    await loginAs(await createUser(condo, 'admin'))

    expect((await eraseResidentRoute(jsonRequest('DELETE', CONFIRM), routeCtx(resident._id))).status).toBe(200)
    expect(await (await residents()).countDocuments({})).toBe(0)
    expect(send).not.toHaveBeenCalled() // sem encomendas, nada a apagar no S3
  })

  it('sem a frase de confirmação nada é apagado', async () => {
    const condo = await createCondo()
    const resident = await createResident(condo)
    await packageWithData(condo, resident._id, 1)
    await loginAs(await createUser(condo, 'admin'))

    for (const body of [undefined, {}, { confirm: 'sim' }, { confirm: ERASE_CONFIRMATION.toLowerCase() }]) {
      expect((await eraseResidentRoute(jsonRequest('DELETE', body), routeCtx(resident._id))).status).toBe(400)
    }
    expect((await eraseResidentRoute(jsonRequest('DELETE', CONFIRM), routeCtx('abc'))).status).toBe(400)
    expect(await (await residents()).countDocuments({})).toBe(1)
    expect(send).not.toHaveBeenCalled()
  })

  it('não alcança morador de outro condomínio', async () => {
    const other = await createCondo()
    const foreign = await createResident(other, 'Do Outro')
    const pkg = await packageWithData(other, foreign._id, 1)
    await loginAs(await createUser(await createCondo(), 'admin'))

    expect((await eraseResidentRoute(jsonRequest('DELETE', CONFIRM), routeCtx(foreign._id))).status).toBe(404)
    expect((await (await residents()).findOne({ _id: foreign._id }))!.name).toBe('Do Outro')
    expect((await (await packages()).findOne({ _id: pkg._id }))!.notes).toBe('Deixar com a filha')
    expect(send).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/users/[id]/erase', () => {
  it('apaga o usuário, a foto e os links de senha; no histórico o nome vira "Usuário removido"', async () => {
    const condo = await createCondo()
    const admin = await createUser(condo, 'admin')
    const porteiro = await createUser(condo, 'porteiro', { name: 'Carlos Porteiro', email: 'carlos@teste.com' })
    const avatar = `${BASE}condos/${condo._id.toString()}/users/${porteiro._id.toString()}/avatar.jpg`
    await (await users()).updateOne({ _id: porteiro._id }, { $set: { photo_url: avatar } })
    await (await passwordResetTokens()).insertOne({ user_id: porteiro._id, token_hash: 'x', expires_at: new Date(Date.now() + 60_000) })
    const pkgId = new ObjectId()
    await logAction({ condo_id: condo._id, entity: 'packages', entity_id: pkgId, action: 'created', actor_id: porteiro._id, actor_name: 'Carlos Porteiro', after: { code: 'PKG-1' } })
    await logAction({ condo_id: condo._id, entity: 'users', entity_id: porteiro._id, action: 'created', actor_id: admin._id, actor_name: admin.name, after: { name: 'Carlos Porteiro', email: 'carlos@teste.com' } })
    const porteiroToken = await loginAs(porteiro)
    await loginAs(admin)

    const res = await eraseUserRoute(jsonRequest('DELETE', CONFIRM), routeCtx(porteiro._id))
    expect(await res.json()).toEqual({ ok: true, files: 1 })

    expect(await (await users()).findOne({ _id: porteiro._id })).toBeNull()
    expect(await (await passwordResetTokens()).countDocuments({})).toBe(0)
    expect(deletedKeys()).toEqual([`condos/${condo._id.toString()}/users/${porteiro._id.toString()}/avatar.jpg`])

    const logs = await (await auditLogs()).find({ condo_id: condo._id }).toArray()
    expect(JSON.stringify(logs)).not.toMatch(/Carlos|carlos@teste\.com/)
    // o que ele FEZ continua registrado, sem o nome
    expect(logs.find((l) => l.entity_id.equals(pkgId))).toMatchObject({ actor_name: ERASED_ACTOR_NAME, after: { code: 'PKG-1' } })

    // token antigo dele não vale mais nada
    requestState.cookies.set(AUTH_COOKIE, porteiroToken)
    expect(await getSession()).toBeNull()
  })

  it('não remove a si mesmo, nem sem confirmação, nem usuário de outro condomínio', async () => {
    const admin = await createUser(await createCondo(), 'admin')
    const colleague = await createUser(admin.condo, 'zelador')
    const foreign = await createUser(await createCondo(), 'porteiro')
    await loginAs(admin)

    expect((await eraseUserRoute(jsonRequest('DELETE', CONFIRM), routeCtx(admin._id))).status).toBe(400)
    expect((await eraseUserRoute(jsonRequest('DELETE', {}), routeCtx(colleague._id))).status).toBe(400)
    expect((await eraseUserRoute(jsonRequest('DELETE', CONFIRM), routeCtx(foreign._id))).status).toBe(404)
    expect((await eraseUserRoute(jsonRequest('DELETE', CONFIRM), routeCtx('abc'))).status).toBe(400)
    expect(await (await users()).countDocuments({})).toBe(3)
  })
})

describe('DELETE /api/condo/erase', () => {
  async function fullCondo(name: string) {
    const condo = await createCondo(name)
    const admin = await createUser(condo, 'admin')
    const porteiro = await createUser(condo, 'porteiro')
    const resident = await createResident(condo)
    await packageWithData(condo, resident._id, 1)
    await (await passwordResetTokens()).insertOne({ user_id: porteiro._id, token_hash: name, expires_at: new Date(Date.now() + 60_000) })
    return { condo, admin }
  }

  const count = async (condo: TestCondo) => ({
    condo: await (await condominiums()).countDocuments({ _id: condo._id }),
    users: await (await users()).countDocuments({ condo_id: condo._id }),
    residents: await (await residents()).countDocuments({ condo_id: condo._id }),
    packages: await (await packages()).countDocuments({ condo_id: condo._id }),
    logs: await (await auditLogs()).countDocuments({ condo_id: condo._id }),
  })

  it('apaga o condomínio inteiro — e só ele', async () => {
    const mine = await fullCondo('Edifício Sol')
    const other = await fullCondo('Edifício Lua')
    const before = await count(other.condo)
    await loginAs(mine.admin)
    send.mockResolvedValueOnce({ Contents: [{ Key: 'k1' }, { Key: 'k2' }] })
    vi.spyOn(console, 'info').mockImplementation(() => {})

    const res = await eraseCondoRoute(jsonRequest('DELETE', { confirm: 'Edifício Sol', password: PASSWORD }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, files: 2, packages: 1, residents: 1, users: 2 })
    expect(res.cookies.get(AUTH_COOKIE)).toMatchObject({ value: '', maxAge: 0 })

    expect(await count(mine.condo)).toEqual({ condo: 0, users: 0, residents: 0, packages: 0, logs: 0 })
    expect(await count(other.condo)).toEqual(before)
    expect(await (await passwordResetTokens()).find({}).toArray()).toMatchObject([{ token_hash: 'Edifício Lua' }])

    // S3: listou e apagou só a pasta deste condomínio
    const list = send.mock.calls.map(([c]) => c).find((c) => c instanceof ListObjectsV2Command) as ListObjectsV2Command
    expect(list.input.Prefix).toBe(`condos/${mine.condo._id.toString()}/`)
    expect(deletedKeys()).toEqual(['k1', 'k2'])

    // a sessão de quem apagou morre junto
    expect(await getSession()).toBeNull()
  })

  it('exige o nome exato do condomínio e a senha de quem pede', async () => {
    const { condo, admin } = await fullCondo('Edifício Sol')
    const before = await count(condo)
    await loginAs(admin)
    const attempt = (body: unknown) => eraseCondoRoute(jsonRequest('DELETE', body))

    expect((await attempt(undefined)).status).toBe(400)
    expect((await attempt({ confirm: 'Edifício Sol' })).status).toBe(400)
    expect((await attempt({ confirm: 'edifício sol', password: PASSWORD })).status).toBe(400)
    expect((await attempt({ confirm: 'Edifício Sol', password: 'errada' })).status).toBe(400)

    expect(await count(condo)).toEqual(before)
    expect(send).not.toHaveBeenCalled()
  })

  it('bloqueia depois de 5 senhas erradas', async () => {
    const { condo, admin } = await fullCondo('Edifício Sol')
    await loginAs(admin)
    const attempt = (password: string) => eraseCondoRoute(jsonRequest('DELETE', { confirm: 'Edifício Sol', password }))

    for (let i = 0; i < 5; i++) expect((await attempt('errada')).status).toBe(400)
    expect((await attempt(PASSWORD)).status).toBe(429)
    expect((await count(condo)).condo).toBe(1)
  })

  it('condomínio que já não existe → 404', async () => {
    const { condo, admin } = await fullCondo('Edifício Sol')
    await loginAs(admin)
    await (await condominiums()).deleteOne({ _id: condo._id })

    const res = await eraseCondoRoute(jsonRequest('DELETE', { confirm: 'Edifício Sol', password: PASSWORD }))
    expect(res.status).toBe(404)
    expect((await getCondo()).status).toBe(404)
    expect(await (await users()).countDocuments({ condo_id: condo._id })).toBe(2)
  })
})
