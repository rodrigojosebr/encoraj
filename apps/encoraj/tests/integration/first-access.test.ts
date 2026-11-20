import { describe, expect, it } from 'vitest'
import bcrypt from 'bcryptjs'
import { createHash } from 'crypto'
import type { ObjectId } from 'mongodb'
import { POST as login } from '@/app/api/auth/route'
import { POST as reset } from '@/app/api/auth/reset/route'
import { POST as createUserRoute } from '@/app/api/users/route'
import { PUT as updateUser } from '@/app/api/users/[id]/route'
import { PUT as changePassword } from '@/app/api/users/me/password/route'
import { GET as getCondo } from '@/app/api/condo/route'
import { POST as createCondoRoute } from '@/app/api/admin/condos/route'
import { POST as createOrgRoute } from '@/app/api/admin/organizations/route'
import { getSession, getSessionForPasswordChange } from '@/lib/auth/session'
import { AUTH_COOKIE } from '@/lib/auth/cookies'
import { passwordResetTokens, users } from '@/lib/db/collections'
import { createCondo, createUser, jsonRequest, loginAs, PASSWORD, routeCtx } from '../helpers/factory'
import { requestState } from '../helpers/request-state'

const INITIAL = 'senha-inicial-123'
const flagOf = async (filter: { _id: ObjectId } | { email: string }) => (await (await users()).findOne(filter))!.must_change_password
const tryChange = (current_password: string, new_password: string) =>
  changePassword(jsonRequest('PUT', { current_password, new_password }))

function adopt(res: Response & { cookies: { get(name: string): { value: string } | undefined } }) {
  requestState.cookies.set(AUTH_COOKIE, res.cookies.get(AUTH_COOKIE)!.value)
}

describe('senha definida por outra pessoa → troca obrigatória no primeiro acesso', () => {
  it('usuário cadastrado pelo admin entra, mas não alcança nada até trocar a senha', async () => {
    await loginAs(await createUser(await createCondo(), 'admin'))
    const created = await createUserRoute(
      jsonRequest('POST', { name: 'João', email: 'joao@teste.com', password: INITIAL, roles: ['porteiro'] }),
    )
    expect(created.status).toBe(201)
    expect(await flagOf({ email: 'joao@teste.com' })).toBe(true)

    const res = await login(jsonRequest('POST', { email: 'joao@teste.com', password: INITIAL }))
    expect(res.status).toBe(200)
    adopt(res)

    // tem cookie válido, mas nenhuma rota o reconhece
    expect(await getSession()).toBeNull()
    expect((await getCondo()).status).toBe(401)
    expect((await createUserRoute(jsonRequest('POST', {}))).status).toBe(401)
    // só a troca de senha enxerga a sessão
    expect(await getSessionForPasswordChange()).toMatchObject({ userName: 'João', mustChangePassword: true })
  })

  it('trocar libera o acesso; repetir a mesma senha ou errar a atual, não', async () => {
    const user = await createUser(await createCondo(), 'porteiro', { mustChangePassword: true })
    await loginAs(user)

    expect((await tryChange(PASSWORD, PASSWORD)).status).toBe(400)
    expect((await tryChange('errada', 'so-eu-sei-123')).status).toBe(400)
    expect(await flagOf({ _id: user._id })).toBe(true)
    expect(await getSession()).toBeNull()

    const ok = await tryChange(PASSWORD, 'so-eu-sei-123')
    expect(ok.status).toBe(200)
    adopt(ok)

    const doc = (await (await users()).findOne({ _id: user._id }))!
    expect(doc.must_change_password).toBeUndefined()
    expect(await bcrypt.compare('so-eu-sei-123', doc.password_hash)).toBe(true)
    expect(await getSession()).toMatchObject({ userId: user._id.toString() })
    expect(await getSessionForPasswordChange()).toMatchObject({ mustChangePassword: false })
    expect((await getCondo()).status).toBe(200)
  })

  it('admin redefine a senha de alguém → a pessoa troca de novo; editar a própria senha não marca', async () => {
    const condo = await createCondo()
    const [admin, porteiro] = [await createUser(condo, 'admin'), await createUser(condo, 'porteiro')]
    await loginAs(admin)

    expect((await updateUser(jsonRequest('PUT', { name: 'Só o Nome' }), routeCtx(porteiro._id))).status).toBe(200)
    expect(await flagOf({ _id: porteiro._id })).toBeUndefined()

    expect((await updateUser(jsonRequest('PUT', { password: INITIAL }), routeCtx(porteiro._id))).status).toBe(200)
    expect(await flagOf({ _id: porteiro._id })).toBe(true)

    expect((await updateUser(jsonRequest('PUT', { password: 'minha-nova-123' }), routeCtx(admin._id))).status).toBe(200)
    expect(await flagOf({ _id: admin._id })).toBeUndefined()
  })

  it('admin criado junto com o condomínio ou com a administradora também troca no primeiro acesso', async () => {
    await loginAs(await createUser(await createCondo(), 'superadmin'))
    const admin = { admin_name: 'Ana', admin_password: INITIAL }

    expect((await createCondoRoute(jsonRequest('POST', { ...admin, condo_name: 'Residencial Sol', admin_email: 'ana@teste.com' }))).status).toBe(201)
    expect(
      (await createOrgRoute(jsonRequest('POST', { ...admin, org_name: 'Administradora Prime', condo_name: 'Residencial Lua', admin_email: 'bia@teste.com' }))).status,
    ).toBe(201)

    expect(await flagOf({ email: 'ana@teste.com' })).toBe(true)
    expect(await flagOf({ email: 'bia@teste.com' })).toBe(true)
  })

  it('redefinir pelo link do email também libera: a senha passou a ser da própria pessoa', async () => {
    const user = await createUser(await createCondo(), 'porteiro', { mustChangePassword: true })
    await (await passwordResetTokens()).insertOne({
      user_id: user._id,
      token_hash: createHash('sha256').update('token-bom').digest('hex'),
      expires_at: new Date(Date.now() + 60_000),
    })

    expect((await reset(jsonRequest('POST', { token: 'token-bom', password: 'so-eu-sei-123' }))).status).toBe(200)
    expect(await flagOf({ _id: user._id })).toBeUndefined()
  })

  it('quem cadastra não escapa da regra marcando a si mesmo: a marca só sai pela troca de senha', async () => {
    const admin = await createUser(await createCondo(), 'admin', { mustChangePassword: true })
    await loginAs(admin)

    expect((await createUserRoute(jsonRequest('POST', {}))).status).toBe(401)
    expect((await updateUser(jsonRequest('PUT', { password: 'atalho-123456' }), routeCtx(admin._id))).status).toBe(401)
    expect(await flagOf({ _id: admin._id })).toBe(true)
  })
})
