import { describe, expect, it } from 'vitest'
import bcrypt from 'bcryptjs'
import { GET as listUsers, POST as createUserRoute } from '@/app/api/users/route'
import { PUT as updateUser, DELETE as deleteUser } from '@/app/api/users/[id]/route'
import { PUT as changePassword } from '@/app/api/users/me/password/route'
import { auditLogs, users } from '@/lib/db/collections'
import { getRole, getStatus } from '@/lib/db/status-map'
import { getSession } from '@/lib/auth/session'
import { AUTH_COOKIE } from '@/lib/auth/cookies'
import { createCondo, createUser, jsonRequest, loginAs, PASSWORD, routeCtx } from '../helpers/factory'
import { requestState } from '../helpers/request-state'

const newUser = { name: 'Novo Zelador', email: 'Ze@Teste.com', password: 'senha-forte-123', role: 'zelador' }

describe('GET /api/users', () => {
  it('lista só usuários ativos do próprio condomínio, sem hash de senha', async () => {
    const [a, b] = [await createCondo(), await createCondo()]
    const admin = await createUser(a, 'admin')
    const gone = await createUser(a, 'porteiro')
    await createUser(b, 'admin')
    await (await users()).updateOne({ _id: gone._id }, { $set: { status_id: (await getStatus('deleted'))._id } })

    await loginAs(admin)
    const res = await listUsers()
    const body = (await res.json()) as Array<Record<string, unknown>>

    expect(body.map((u) => u._id)).toEqual([admin._id.toString()])
    expect(JSON.stringify(body)).not.toContain('password')
  })
})

describe('POST /api/users', () => {
  it('admin cria usuário no próprio condomínio, com email normalizado e audit log', async () => {
    const admin = await createUser(await createCondo())
    await loginAs(admin)

    const res = await createUserRoute(jsonRequest('POST', newUser))
    expect(res.status).toBe(201)

    const created = await (await users()).findOne({ email: 'ze@teste.com' })
    expect(created).toMatchObject({ condo_id: admin.condo._id, name: 'Novo Zelador' })
    expect(created!.role_id.equals((await getRole('zelador'))._id)).toBe(true)
    expect(await bcrypt.compare(newUser.password, created!.password_hash)).toBe(true)

    const log = await (await auditLogs()).findOne({ entity_id: created!._id })
    expect(log).toMatchObject({ entity: 'users', action: 'created', actor_id: admin._id, condo_id: admin.condo._id })
    expect(JSON.stringify(log)).not.toContain(created!.password_hash)
  })

  it('email ainda ativo em OUTRO condomínio → 409; depois de desativado lá → 201', async () => {
    const [a, b] = [await createCondo('A'), await createCondo('B')]
    const inA = await createUser(a, 'zelador', { email: 'ze@teste.com' })
    await loginAs(await createUser(b, 'admin'))

    expect((await createUserRoute(jsonRequest('POST', newUser))).status).toBe(409)

    await (await users()).updateOne({ _id: inA._id }, { $set: { status_id: (await getStatus('deleted'))._id } })
    expect((await createUserRoute(jsonRequest('POST', newUser))).status).toBe(201)

    // a conta antiga continua desativada e presa ao A; a nova pertence ao B
    const accounts = await (await users()).find({ email: 'ze@teste.com' }).toArray()
    expect(accounts.map((u) => u.condo_id.toString()).sort()).toEqual([a._id.toString(), b._id.toString()].sort())
  })

  it.each([
    ['senha curta', { password: '1234567' }],
    ['role inexistente', { role: 'morador' }],
    ['email inválido', { email: 'x' }],
  ])('%s → 400', async (_name, override) => {
    await loginAs(await createUser(await createCondo()))
    expect((await createUserRoute(jsonRequest('POST', { ...newUser, ...override }))).status).toBe(400)
  })
})

describe('PUT /api/users/[id]', () => {
  it('não edita usuário de outro condomínio nem usuário desativado', async () => {
    const [a, b] = [await createCondo(), await createCondo()]
    const foreign = await createUser(b, 'porteiro')
    const gone = await createUser(a, 'porteiro')
    await (await users()).updateOne({ _id: gone._id }, { $set: { status_id: (await getStatus('deleted'))._id } })
    await loginAs(await createUser(a, 'admin'))

    for (const target of [foreign, gone]) {
      const res = await updateUser(jsonRequest('PUT', { name: 'Invadido', password: 'senha-nova-123' }), routeCtx(target._id))
      expect(res.status).toBe(404)
      const doc = await (await users()).findOne({ _id: target._id })
      expect(doc!.name).toBe(target.name)
      expect(await bcrypt.compare(PASSWORD, doc!.password_hash)).toBe(true)
    }
    expect((await updateUser(jsonRequest('PUT', {}), routeCtx('id-invalido'))).status).toBe(400)
  })

  it('trocar o role ou a senha de alguém derruba a sessão dessa pessoa', async () => {
    const condo = await createCondo()
    const admin = await createUser(condo, 'admin')
    const porteiro = await createUser(condo, 'porteiro')
    const zelador = await createUser(condo, 'zelador')

    await loginAs(admin)
    expect((await updateUser(jsonRequest('PUT', { role: 'sindico' }), routeCtx(porteiro._id))).status).toBe(200)

    await loginAs(porteiro) // token antigo, ainda com role porteiro
    expect(await getSession()).toBeNull()

    const zeladorToken = await loginAs(zelador)
    await new Promise((r) => setTimeout(r, 1100)) // iat tem precisão de segundo
    await loginAs(admin)
    expect((await updateUser(jsonRequest('PUT', { password: 'senha-nova-123' }), routeCtx(zelador._id))).status).toBe(200)

    requestState.cookies.set(AUTH_COOKIE, zeladorToken)
    expect(await getSession()).toBeNull()
  })

  it('email em uso por outro usuário ativo → 409', async () => {
    const condo = await createCondo()
    const admin = await createUser(condo, 'admin')
    const other = await createUser(await createCondo(), 'zelador', { email: 'ocupado@teste.com' })
    const target = await createUser(condo, 'porteiro')
    await loginAs(admin)

    const res = await updateUser(jsonRequest('PUT', { email: 'OCUPADO@teste.com' }), routeCtx(target._id))
    expect(res.status).toBe(409)
    expect(other.email).toBe('ocupado@teste.com')
  })

  it('admin não rebaixa o próprio role', async () => {
    const admin = await createUser(await createCondo())
    await loginAs(admin)
    expect((await updateUser(jsonRequest('PUT', { role: 'porteiro' }), routeCtx(admin._id))).status).toBe(400)
    expect((await updateUser(jsonRequest('PUT', { role: 'admin', name: 'Novo Nome' }), routeCtx(admin._id))).status).toBe(200)
  })
})

describe('DELETE /api/users/[id]', () => {
  it('desativa (soft-delete), registra audit log e derruba a sessão', async () => {
    const condo = await createCondo()
    const admin = await createUser(condo, 'admin')
    const target = await createUser(condo, 'zelador')
    await loginAs(admin)

    expect((await deleteUser(jsonRequest('DELETE'), routeCtx(target._id))).status).toBe(200)

    const doc = await (await users()).findOne({ _id: target._id })
    expect(doc!.status_id.equals((await getStatus('deleted'))._id)).toBe(true)
    expect(doc!.deleted_by).toEqual(admin._id)
    expect(await (await auditLogs()).countDocuments({ entity_id: target._id, action: 'deleted' })).toBe(1)

    await loginAs(target)
    expect(await getSession()).toBeNull()
  })

  it('não desativa a si mesmo nem usuário de outro condomínio', async () => {
    const admin = await createUser(await createCondo())
    const foreign = await createUser(await createCondo(), 'porteiro')
    await loginAs(admin)

    expect((await deleteUser(jsonRequest('DELETE'), routeCtx(admin._id))).status).toBe(400)
    expect((await deleteUser(jsonRequest('DELETE'), routeCtx(foreign._id))).status).toBe(404)
    const doc = await (await users()).findOne({ _id: foreign._id })
    expect(doc!.status_id.equals((await getStatus('active'))._id)).toBe(true)
  })
})

describe('PUT /api/users/me/password', () => {
  it('exige a senha atual e re-assina o cookie de quem trocou', async () => {
    const user = await createUser(await createCondo(), 'porteiro')
    await loginAs(user)

    const wrong = await changePassword(jsonRequest('PUT', { current_password: 'errada', new_password: 'senha-nova-123' }))
    expect(wrong.status).toBe(400)

    const short = await changePassword(jsonRequest('PUT', { current_password: PASSWORD, new_password: 'curta' }))
    expect(short.status).toBe(400)

    const ok = await changePassword(jsonRequest('PUT', { current_password: PASSWORD, new_password: 'senha-nova-123' }))
    expect(ok.status).toBe(200)
    expect(ok.cookies.get(AUTH_COOKIE)?.value).toBeTruthy()

    const doc = await (await users()).findOne({ _id: user._id })
    expect(await bcrypt.compare('senha-nova-123', doc!.password_hash)).toBe(true)
    expect(doc!.password_changed_at).toBeInstanceOf(Date)
    expect(await (await auditLogs()).countDocuments({ entity_id: user._id })).toBe(1)
  })

  it('bloqueia depois de 5 senhas atuais erradas', async () => {
    await loginAs(await createUser(await createCondo()))
    const attempt = (current: string) =>
      changePassword(jsonRequest('PUT', { current_password: current, new_password: 'senha-nova-123' }))

    for (let i = 0; i < 5; i++) expect((await attempt('errada')).status).toBe(400)
    expect((await attempt(PASSWORD)).status).toBe(429)
  })
})
