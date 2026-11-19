import { describe, expect, it } from 'vitest'
import { ObjectId } from 'mongodb'
import { POST as createOrgRoute } from '@/app/api/admin/organizations/route'
import { POST as createCondoRoute } from '@/app/api/admin/condos/route'
import { POST as createOrgCondo } from '@/app/api/org/condos/route'
import { POST as enterCondo } from '@/app/api/condos/[id]/enter/route'
import { POST as login } from '@/app/api/auth/route'
import { GET as listUsers, POST as createUserRoute } from '@/app/api/users/route'
import { PUT as changePassword } from '@/app/api/users/me/password/route'
import { PUT as updateUser, DELETE as deleteUser } from '@/app/api/users/[id]/route'
import { DELETE as eraseUserRoute } from '@/app/api/users/[id]/erase/route'
import { getSession } from '@/lib/auth/session'
import { verifyToken } from '@/lib/auth/jwt'
import { AUTH_COOKIE } from '@/lib/auth/cookies'
import { userRoleNames } from '@/lib/auth/user-roles'
import { ERASE_CONFIRMATION, eraseCondo } from '@/lib/lgpd/erase'
import { auditLogs, condominiums, organizations, users } from '@/lib/db/collections'
import { getRole } from '@/lib/db/status-map'
import {
  ALL_ROLES,
  createCondo,
  createOrg,
  createUser,
  jsonRequest,
  loginAs,
  routeCtx,
  type TestCondo,
  type TestOrg,
} from '../helpers/factory'
import { requestState } from '../helpers/request-state'

const orgBody = {
  orgName: 'Administradora Prime',
  condoName: 'Residencial Banana',
  adminName: 'Carla',
  adminEmail: 'Carla@Prime.com',
  adminPassword: 'senha-forte-123',
}
const enter = (id: ObjectId | string) => enterCondo(jsonRequest('POST'), routeCtx(String(id)))
const newOrgCondo = (condoName = 'Residencial Maçã') => createOrgCondo(jsonRequest('POST', { condoName }))
const rolesOf = async (id: ObjectId) => (await userRoleNames((await (await users()).findOne({ _id: id }))!)).sort()

/** Faz o "request atual" usar o cookie devolvido pela rota, como o navegador faria. */
function adopt(res: Response & { cookies: { get(name: string): { value: string } | undefined } }) {
  const token = res.cookies.get(AUTH_COOKIE)!.value
  requestState.cookies.set(AUTH_COOKIE, token)
  return verifyToken(token)
}

/** Administradora com dois condomínios e o admin dela "morando" no primeiro. */
async function orgScenario(name = 'Prime') {
  const org = await createOrg(name)
  const [first, second] = [await createCondo(`${name} A`, org), await createCondo(`${name} B`, org)]
  const orgAdmin = await createUser(first, 'administradora', { org })
  return { org, first, second, orgAdmin }
}

const asSuperAdmin = async () => loginAs(await createUser(await createCondo('Plataforma'), 'superadmin'))

describe('POST /api/admin/organizations — só o super admin cria administradora', () => {
  it('nasce com o primeiro condomínio e com o admin dela', async () => {
    await asSuperAdmin()

    const res = await createOrgRoute(jsonRequest('POST', orgBody))
    expect(res.status).toBe(201)

    const org = (await (await organizations()).findOne({ name: 'Administradora Prime' }))!
    const condo = (await (await condominiums()).findOne({ name: 'Residencial Banana' }))!
    const admin = (await (await users()).findOne({ email: 'carla@prime.com' }))!
    expect(await res.json()).toEqual({ _id: org._id.toString(), condo_id: condo._id.toString() })
    expect(condo.org_id).toEqual(org._id)
    expect(admin).toMatchObject({ name: 'Carla', condo_id: condo._id, org_id: org._id })
    expect(await userRoleNames(admin)).toEqual(['administradora'])
    expect(await (await auditLogs()).findOne({ entity: 'condominiums', entity_id: condo._id })).toMatchObject({ action: 'created' })
  })

  it('o admin criado entra, tem a administradora na sessão e não vira super admin', async () => {
    await asSuperAdmin()
    await createOrgRoute(jsonRequest('POST', orgBody))

    const token = await adopt(await login(jsonRequest('POST', { email: 'carla@prime.com', password: orgBody.adminPassword })))
    expect(token.roles).toEqual(['administradora'])
    expect(await getSession()).toBeNull() // senha definida pelo super admin: primeiro troca
    await adopt(await changePassword(jsonRequest('PUT', { current_password: orgBody.adminPassword, new_password: 'so-eu-sei-123' })))
    const org = (await (await organizations()).findOne({}))!
    expect((await getSession())!.orgId).toBe(org._id.toString())

    expect((await createOrgRoute(jsonRequest('POST', { ...orgBody, adminEmail: 'x@prime.com' }))).status).toBe(403)
    expect((await createCondoRoute(jsonRequest('POST', { ...orgBody, adminEmail: 'x@prime.com' }))).status).toBe(403)
  })

  it('email em uso → 409 e nada fica para trás; dados inválidos → 400', async () => {
    await asSuperAdmin()
    await createUser(await createCondo(), 'zelador', { email: 'carla@prime.com' })

    expect((await createOrgRoute(jsonRequest('POST', orgBody))).status).toBe(409)
    for (const override of [{ orgName: 'ab' }, { condoName: '' }, { adminEmail: 'x' }, { adminPassword: '123' }]) {
      expect((await createOrgRoute(jsonRequest('POST', { ...orgBody, adminEmail: 'ok@prime.com', ...override }))).status).toBe(400)
    }
    expect(await (await organizations()).countDocuments({})).toBe(0)
    expect(await (await condominiums()).countDocuments({ name: orgBody.condoName })).toBe(0)
  })

  it.each([...ALL_ROLES, 'administradora' as const])('role %s não cria administradora', async (role) => {
    const org = await createOrg()
    await loginAs(await createUser(await createCondo(undefined, org), role, role === 'administradora' ? { org } : {}))
    expect((await createOrgRoute(jsonRequest('POST', orgBody))).status).toBe(403)
    expect(await (await organizations()).countDocuments({})).toBe(1)
  })
})

describe('admin da administradora', () => {
  it('pode tudo nos condomínios dela: entra no outro e monta a equipe de lá', async () => {
    const { first, second, orgAdmin } = await orgScenario()
    await loginAs(orgAdmin)
    expect(await getSession()).toMatchObject({ condoId: first._id.toString() })

    const token = await adopt(await enter(second._id))
    expect(token).toMatchObject({ sub: orgAdmin._id.toString(), roles: ['administradora'], condo_id: second._id.toString() })
    expect(await getSession()).toMatchObject({ condoId: second._id.toString() })

    const res = await createUserRoute(
      jsonRequest('POST', { name: 'João', email: 'joao@teste.com', password: 'senha-forte-123', roles: ['porteiro'] }),
    )
    expect(res.status).toBe(201)
    const joao = (await (await users()).findOne({ email: 'joao@teste.com' }))!
    expect(joao.condo_id).toEqual(second._id)
    expect(joao.org_id).toBeUndefined()

    const list = await (await listUsers()).json()
    expect(list.map((u: { email: string }) => u.email)).toEqual(['joao@teste.com'])
  })

  it('cria condomínio dentro da administradora dela — sem admin próprio, e já consegue entrar', async () => {
    const { org, orgAdmin } = await orgScenario()
    await loginAs(orgAdmin)

    const res = await newOrgCondo()
    expect(res.status).toBe(201)
    const created = (await (await condominiums()).findOne({ name: 'Residencial Maçã' }))!
    expect(created).toMatchObject({ org_id: org._id, slug: 'residencial-maca' })
    expect(await (await users()).countDocuments({ condo_id: created._id })).toBe(0)
    expect(await (await auditLogs()).findOne({ entity_id: created._id })).toMatchObject({ actor_id: orgAdmin._id, condo_id: created._id })

    expect((await enter(created._id)).status).toBe(200)
    expect((await newOrgCondo('ab')).status).toBe(400)
  })

  it('não entra em condomínio de outra administradora nem em autogerido — nem com token forjado', async () => {
    const { orgAdmin } = await orgScenario('Prime')
    const other = await orgScenario('Rival')
    const selfManaged = await createCondo('Autogerido')
    await loginAs(orgAdmin)

    for (const target of [other.first, selfManaged]) {
      const res = await enter(target._id)
      expect(res.status).toBe(404)
      expect(res.cookies.get(AUTH_COOKIE)).toBeUndefined()
    }
    expect((await enter(new ObjectId())).status).toBe(404)

    for (const target of [other.first, selfManaged, { _id: new ObjectId(), name: 'Inventado' }]) {
      await loginAs({ ...orgAdmin, condo: target })
      expect(await getSession(), target.name).toBeNull()
    }
  })

  it('org_id sem a role não vale nada; e a role some, o acesso aos outros condomínios some', async () => {
    const { org, second } = await orgScenario()
    const localAdmin = await createUser(await createCondo('Local', org), 'admin', { org })
    await loginAs({ ...localAdmin, condo: second })
    expect(await getSession()).toBeNull()
    await loginAs(localAdmin)
    expect((await getSession())!.orgId).toBeUndefined()
    expect((await enter(second._id)).status).toBe(403)
    expect((await newOrgCondo()).status).toBe(403)

    const { orgAdmin, second: otherCondo } = await orgScenario('Outra')
    await loginAs(orgAdmin)
    await adopt(await enter(otherCondo._id))
    await (await users()).updateOne({ _id: orgAdmin._id }, { $set: { role_ids: [(await getRole('admin'))._id] } })
    expect(await getSession()).toBeNull()
  })

  it.each(ALL_ROLES)('role de condomínio %s, mesmo em condomínio de administradora, fica presa ao dela', async (role) => {
    const { org, first, second } = await orgScenario()
    const user = await createUser(first, role)
    await loginAs(user)

    expect((await enter(second._id)).status).toBe(403)
    expect((await newOrgCondo()).status).toBe(403)
    expect(await (await condominiums()).countDocuments({ org_id: org._id })).toBe(2)
    await loginAs({ ...user, condo: second })
    expect(await getSession()).toBeNull()
  })
})

describe('POST /api/org/condos — a administradora é a do condomínio da sessão', () => {
  it('super admin cria na administradora do condomínio em que entrou; em autogerido → 409', async () => {
    const { org, first } = await orgScenario()
    await asSuperAdmin()

    expect((await newOrgCondo()).status).toBe(409)
    expect(await (await condominiums()).countDocuments({ name: 'Residencial Maçã' })).toBe(0)

    await adopt(await enter(first._id))
    expect((await newOrgCondo()).status).toBe(201)
    expect((await (await condominiums()).findOne({ name: 'Residencial Maçã' }))!.org_id).toEqual(org._id)
  })

  it('administradora no corpo do request é ignorada', async () => {
    const { org, orgAdmin } = await orgScenario('Prime')
    const rival = await createOrg('Rival')
    await loginAs(orgAdmin)

    const res = await createOrgCondo(jsonRequest('POST', { condoName: 'Residencial Maçã', org_id: rival._id.toString(), orgId: rival._id.toString() }))
    expect(res.status).toBe(201)
    expect((await (await condominiums()).findOne({ name: 'Residencial Maçã' }))!.org_id).toEqual(org._id)
  })
})

describe('ninguém mexe no admin da administradora por baixo', () => {
  const edit = (id: ObjectId, body: unknown) => updateUser(jsonRequest('PUT', body), routeCtx(id))
  const erase = (id: ObjectId) => eraseUserRoute(jsonRequest('DELETE', { confirm: ERASE_CONFIRMATION }), routeCtx(id))

  it('admin do condomínio não edita, não desativa e não remove o admin da administradora', async () => {
    const { first, orgAdmin } = await orgScenario()
    await loginAs(await createUser(first, 'admin'))

    expect((await edit(orgAdmin._id, { name: 'Invadido', password: 'senha-nova-123' })).status).toBe(403)
    expect((await deleteUser(jsonRequest('DELETE'), routeCtx(orgAdmin._id))).status).toBe(403)
    expect((await erase(orgAdmin._id)).status).toBe(403)

    const doc = (await (await users()).findOne({ _id: orgAdmin._id }))!
    expect(doc).toMatchObject({ name: orgAdmin.name })
    expect(doc.deleted_at).toBeUndefined()
  })

  it('a role administradora não entra pela API de usuários, nem por quem já a tem', async () => {
    const { first, orgAdmin } = await orgScenario()
    const target = await createUser(first, 'porteiro')
    const body = { name: 'Esperto', email: 'esperto@teste.com', password: 'senha-forte-123' }

    for (const actor of [await createUser(first, 'admin'), orgAdmin]) {
      await loginAs(actor)
      expect((await createUserRoute(jsonRequest('POST', { ...body, roles: ['administradora'] }))).status).toBe(400)
      expect((await edit(target._id, { roles: ['porteiro', 'administradora'] })).status).toBe(400)
    }
    expect(await rolesOf(target._id)).toEqual(['porteiro'])
  })

  it('um colega da mesma administradora (ou o super admin) pode; e editar perfis nunca derruba a role', async () => {
    const { org, first, orgAdmin } = await orgScenario()
    const colleague = await createUser(first, 'administradora', { org })
    await loginAs(orgAdmin)

    expect((await edit(colleague._id, { name: 'Novo Nome', roles: ['sindico'] })).status).toBe(200)
    expect(await rolesOf(colleague._id)).toEqual(['administradora', 'sindico'])
    // quem tem a role da administradora pode ficar sem perfil de condomínio...
    expect((await edit(colleague._id, { roles: [] })).status).toBe(200)
    expect(await rolesOf(colleague._id)).toEqual(['administradora'])
    // ...e o próprio admin da administradora edita a si mesmo sem precisar do perfil admin
    expect((await edit(orgAdmin._id, { name: 'Eu Mesma', roles: [] })).status).toBe(200)
    expect(await rolesOf(orgAdmin._id)).toEqual(['administradora'])
    // um usuário comum, não: ficaria sem conseguir entrar
    const porteiro = await createUser(first, 'porteiro')
    expect((await edit(porteiro._id, { roles: [] })).status).toBe(400)
    expect(await rolesOf(porteiro._id)).toEqual(['porteiro'])

    expect((await deleteUser(jsonRequest('DELETE'), routeCtx(colleague._id))).status).toBe(200)

    const third = await createUser(first, 'administradora', { org, email: 'terceira@teste.com' })
    await asSuperAdmin()
    await adopt(await enter(first._id))
    expect((await erase(third._id)).status).toBe(200)
  })
})

describe('remoção definitiva de condomínio de administradora', () => {
  const state = async (org: TestOrg, condo: TestCondo, adminId: ObjectId) => ({
    org: await (await organizations()).countDocuments({ _id: org._id }),
    condo: await (await condominiums()).countDocuments({ _id: condo._id }),
    admin: await (await users()).findOne({ _id: adminId }),
  })

  it('o admin da administradora não some com o condomínio: vai para outro dela, sem a foto que estava lá', async () => {
    const { org, first, second, orgAdmin } = await orgScenario()
    await (await users()).updateOne({ _id: orgAdmin._id }, { $set: { photo_url: 'https://x/avatar.jpg' } })
    const porteiro = await createUser(first, 'porteiro')

    expect(await eraseCondo(first._id)).toMatchObject({ users: 1 })

    const after = await state(org, first, orgAdmin._id)
    expect(after).toMatchObject({ org: 1, condo: 0, admin: { condo_id: second._id, org_id: org._id } })
    expect(after.admin!.photo_url).toBeUndefined()
    expect(await (await users()).findOne({ _id: porteiro._id })).toBeNull()
  })

  it('era o último condomínio: a administradora sai junto, com os admins dela', async () => {
    const org = await createOrg('Sozinha')
    const only = await createCondo('Único', org)
    const orgAdmin = await createUser(only, 'administradora', { org })
    const untouched = await orgScenario('Intacta')

    expect(await eraseCondo(only._id)).toMatchObject({ users: 1 })

    expect(await state(org, only, orgAdmin._id)).toEqual({ org: 0, condo: 0, admin: null })
    expect(await state(untouched.org, untouched.first, untouched.orgAdmin._id)).toMatchObject({ org: 1, condo: 1 })
  })

  it('condomínio autogerido continua apagando só a si mesmo', async () => {
    const { org, first, orgAdmin } = await orgScenario()
    const selfManaged = await createCondo('Autogerido')
    await createUser(selfManaged, 'admin')

    expect(await eraseCondo(selfManaged._id)).toMatchObject({ users: 1 })
    expect(await state(org, first, orgAdmin._id)).toMatchObject({ org: 1, condo: 1, admin: { condo_id: first._id } })
  })
})
