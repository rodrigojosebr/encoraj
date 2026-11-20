import { describe, expect, it } from 'vitest'
import bcrypt from 'bcryptjs'
import { ObjectId } from 'mongodb'
import { POST as createCondoRoute } from '@/app/api/admin/condos/route'
import { POST as enterCondo } from '@/app/api/condos/[id]/enter/route'
import { POST as login } from '@/app/api/auth/route'
import { POST as createUserRoute } from '@/app/api/users/route'
import { PUT as changePassword } from '@/app/api/users/me/password/route'
import { PUT as updateResident } from '@/app/api/residents/[id]/route'
import { GET as getCondo } from '@/app/api/condo/route'
import { getSession } from '@/lib/auth/session'
import { verifyToken } from '@/lib/auth/jwt'
import { AUTH_COOKIE } from '@/lib/auth/cookies'
import { userRoleNames } from '@/lib/auth/user-roles'
import { auditLogs, condominiums, users } from '@/lib/db/collections'
import { ALL_ROLES, createCondo, createResident, createUser, jsonRequest, loginAs, routeCtx } from '../helpers/factory'
import { requestState } from '../helpers/request-state'

const body = { condo_name: 'Residencial São José', admin_name: 'Ana', admin_email: 'Ana@Teste.com', admin_password: 'senha-forte-123' }
const post = (data: object = body) => createCondoRoute(jsonRequest('POST', data))
const enter = (id: ObjectId | string) => enterCondo(jsonRequest('POST'), routeCtx(String(id)))

/** Loga um super admin "puro" (só a role de plataforma), no condomínio de casa dele. */
async function asSuperAdmin() {
  const home = await createCondo('Plataforma')
  const owner = await createUser(home, 'superadmin')
  await loginAs(owner)
  return { home, owner }
}

/** Faz o "request atual" usar o cookie devolvido pela rota, como o navegador faria. */
function adopt(res: Response & { cookies: { get(name: string): { value: string } | undefined } }) {
  const token = res.cookies.get(AUTH_COOKIE)!.value
  requestState.cookies.set(AUTH_COOKIE, token)
  return verifyToken(token)
}

describe('POST /api/admin/condos — só o super admin cria condomínio', () => {
  it('cria o condomínio já com o administrador dele, sem trocar a sessão de quem criou', async () => {
    const { home, owner } = await asSuperAdmin()

    const res = await post()
    expect(res.status).toBe(201)
    expect(res.cookies.get(AUTH_COOKIE)).toBeUndefined()

    const condo = (await (await condominiums()).findOne({ name: 'Residencial São José' }))!
    expect(condo.slug).toBe('residencial-sao-jose')
    expect(await res.json()).toEqual({ _id: condo._id.toString(), slug: condo.slug })

    const admin = (await (await users()).findOne({ email: 'ana@teste.com' }))!
    expect(admin).toMatchObject({ name: 'Ana', condo_id: condo._id })
    expect(await userRoleNames(admin)).toEqual(['admin'])
    expect(await bcrypt.compare(body.admin_password, admin.password_hash)).toBe(true)

    const log = await (await auditLogs()).findOne({ entity: 'condominiums', entity_id: condo._id })
    expect(log).toMatchObject({ action: 'created', condo_id: condo._id, actor_id: owner._id })
    expect(JSON.stringify(log)).not.toContain(admin.password_hash)

    expect((await getSession())!.condoId).toBe(home._id.toString())
  })

  it('o administrador criado entra e cuida só do condomínio dele', async () => {
    await asSuperAdmin()
    await post()
    const other = await createCondo()
    await createUser(other, 'porteiro')

    const session = await adopt(await login(jsonRequest('POST', { email: 'ana@teste.com', password: body.admin_password })))
    expect(session.roles).toEqual(['admin'])
    // a senha foi definida pelo super admin: antes de trocar, nada abre
    expect((await getCondo()).status).toBe(401)
    await adopt(await changePassword(jsonRequest('PUT', { current_password: body.admin_password, new_password: 'so-eu-sei-123' })))

    const ana = (await (await users()).findOne({ email: 'ana@teste.com' }))!
    expect((await getSession())!.condoId).toBe(ana.condo_id.toString())
    expect((await createUserRoute(jsonRequest('POST', {}))).status).toBe(400) // passou pela permissão; só falta o corpo
    expect((await post({ ...body, admin_email: 'outra@teste.com' })).status).toBe(403)
    expect((await enter(other._id)).status).toBe(403)
  })

  it.each(ALL_ROLES)('role %s não cria condomínio nem entra em outro', async (role) => {
    const target = await createCondo()
    await loginAs(await createUser(await createCondo(), role))

    expect((await post()).status).toBe(403)
    expect((await enter(target._id)).status).toBe(403)
    expect(await (await condominiums()).countDocuments({ name: body.condo_name })).toBe(0)
  })

  it('nunca reaproveita condomínio de mesmo nome: slug repetido ganha sufixo', async () => {
    await asSuperAdmin()
    const existing = await createCondo('Residencial São José')

    expect((await post()).status).toBe(201)
    expect((await post({ ...body, admin_email: 'outra@teste.com' })).status).toBe(201)

    const slugs = (await (await condominiums()).find({ slug: /^residencial/ }).toArray()).map((c) => c.slug).sort()
    expect(slugs).toEqual(['residencial-sao-jose', 'residencial-sao-jose-2'])
    expect(await (await users()).countDocuments({ condo_id: existing._id })).toBe(0)
  })

  it('nome sem letra latina ganha slug padrão', async () => {
    await asSuperAdmin()
    expect((await post({ ...body, condo_name: '日本語マンション' })).status).toBe(201)
    expect((await (await condominiums()).findOne({ name: '日本語マンション' }))!.slug).toBe('condominio')
  })

  it('email já ativo em qualquer condomínio → 409 e nada é criado', async () => {
    await asSuperAdmin()
    await createUser(await createCondo(), 'zelador', { email: 'ana@teste.com' })

    expect((await post()).status).toBe(409)
    expect(await (await condominiums()).countDocuments({ name: body.condo_name })).toBe(0)
  })

  it.each([
    ['senha curta', { admin_password: '1234567' }],
    ['email inválido', { admin_email: 'x' }],
    ['nome de condomínio curto', { condo_name: 'ab' }],
    ['sem nome do administrador', { admin_name: '' }],
  ])('%s → 400', async (_name, override) => {
    await asSuperAdmin()
    expect((await post({ ...body, ...override })).status).toBe(400)
    expect(await (await condominiums()).countDocuments({ name: body.condo_name })).toBe(0)
  })
})

describe('super admin dentro de um condomínio', () => {
  it('entra em qualquer condomínio e passa a ver e alterar só aquele', async () => {
    const { owner } = await asSuperAdmin()
    const banana = await createCondo('Banana')
    const resident = await createResident(banana, 'Morador da Banana')
    const outsider = await createResident(await createCondo('Outro'), 'Morador de fora')

    const token = await adopt(await enter(banana._id))
    expect(token).toMatchObject({
      sub: owner._id.toString(),
      roles: ['superadmin'],
      condo_id: banana._id.toString(),
      condo_name: 'Banana',
    })
    expect(await getSession()).toMatchObject({ userId: owner._id.toString(), condoId: banana._id.toString() })

    const rename = (id: ObjectId) => updateResident(jsonRequest('PUT', { name: 'Nome Novo' }), routeCtx(id))
    expect((await rename(resident._id)).status).toBe(200)
    expect((await rename(outsider._id)).status).toBe(404) // de outro condomínio: não existe para ele aqui
  })

  it('coloca o João como porteiro do condomínio Banana, com o audit log no nome do super admin', async () => {
    const { home, owner } = await asSuperAdmin()
    const banana = await createCondo('Banana')
    await adopt(await enter(banana._id))

    const res = await createUserRoute(
      jsonRequest('POST', { name: 'João', email: 'joao@teste.com', password: 'senha-forte-123', roles: ['porteiro'] }),
    )
    expect(res.status).toBe(201)

    const joao = (await (await users()).findOne({ email: 'joao@teste.com' }))!
    expect(joao.condo_id).toEqual(banana._id)
    expect(await userRoleNames(joao)).toEqual(['porteiro'])
    expect(await (await users()).countDocuments({ condo_id: home._id })).toBe(1) // só o próprio super admin
    expect(await (await auditLogs()).findOne({ entity: 'users', entity_id: joao._id })).toMatchObject({
      condo_id: banana._id,
      actor_id: owner._id,
    })
  })

  it('volta para o próprio condomínio pela mesma rota', async () => {
    const { home } = await asSuperAdmin()
    const banana = await createCondo('Banana')

    await adopt(await enter(banana._id))
    const back = await adopt(await enter(home._id))
    expect(back).toMatchObject({ condo_id: home._id.toString(), condo_name: 'Plataforma' })
  })

  it('condomínio inexistente ou id inválido não troca a sessão', async () => {
    const { home } = await asSuperAdmin()

    const missing = await enter(new ObjectId())
    expect(missing.status).toBe(404)
    expect(missing.cookies.get(AUTH_COOKIE)).toBeUndefined()
    expect((await enter('abc')).status).toBe(400)
    expect((await getSession())!.condoId).toBe(home._id.toString())
  })

  it('sessão apontando para condomínio que não existe (ou foi apagado) não vale', async () => {
    const { owner } = await asSuperAdmin()
    const gone = await createCondo('Apagado')
    await adopt(await enter(gone._id))
    expect(await getSession()).not.toBeNull()

    await (await condominiums()).deleteOne({ _id: gone._id })
    expect(await getSession()).toBeNull()

    await loginAs({ ...owner, condo: { _id: new ObjectId(), name: 'Inventado' } })
    expect(await getSession()).toBeNull()
  })

  it('quem não é super admin continua preso ao próprio condomínio, mesmo com token de outro', async () => {
    const other = await createCondo('Alvo')
    for (const role of ALL_ROLES) {
      const user = await createUser(await createCondo(), role)
      await loginAs({ ...user, condo: other })
      expect(await getSession(), role).toBeNull()
    }
  })

  it('perdeu a role de super admin enquanto estava em outro condomínio → sessão cai', async () => {
    const { owner } = await asSuperAdmin()
    const banana = await createCondo('Banana')
    await adopt(await enter(banana._id))

    await (await users()).updateOne({ _id: owner._id }, { $set: { role_ids: [] } })
    expect(await getSession()).toBeNull()
  })
})
