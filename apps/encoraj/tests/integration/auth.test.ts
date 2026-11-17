import { beforeEach, describe, expect, it, vi } from 'vitest'
import bcrypt from 'bcryptjs'
import { createHash } from 'crypto'

vi.mock('@/lib/email/mailer', () => ({ sendEmail: vi.fn(async () => {}) }))

import { POST as login, DELETE as logoutRoute } from '@/app/api/auth/route'
import { GET as logoutRedirect } from '@/app/api/auth/logout/route'
import { POST as register } from '@/app/api/register/route'
import { POST as forgot } from '@/app/api/auth/forgot/route'
import { POST as reset } from '@/app/api/auth/reset/route'
import { sendEmail } from '@/lib/email/mailer'
import { verifyToken } from '@/lib/auth/jwt'
import { AUTH_COOKIE } from '@/lib/auth/cookies'
import { getDb } from '@/lib/db/client'
import { ensureIndexes } from '@/lib/db/indexes'
import { auditLogs, condominiums, passwordResetTokens, users } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { TERMS_REQUIRED_MESSAGE, TERMS_VERSION } from '@/lib/legal/terms'
import { createCondo, createUser, jsonRequest, PASSWORD } from '../helpers/factory'

const tryLogin = (email: string, password: string, ip = '10.0.0.1') =>
  login(jsonRequest('POST', { email, password }, { 'x-forwarded-for': ip }))

async function sessionOf(res: Response & { cookies: { get(name: string): { value: string } | undefined } }) {
  return verifyToken(res.cookies.get(AUTH_COOKIE)!.value)
}

describe('POST /api/auth (login)', () => {
  it('login correto devolve cookie com o condomínio e o role do usuário', async () => {
    const user = await createUser(await createCondo('Edifício Sol'), 'porteiro')
    const res = await tryLogin(user.email, PASSWORD)

    expect(res.status).toBe(200)
    expect(await sessionOf(res)).toMatchObject({
      sub: user._id.toString(),
      role: 'porteiro',
      condo_id: user.condo._id.toString(),
      condo_name: 'Edifício Sol',
    })
    expect(res.cookies.get(AUTH_COOKIE)).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/' })
  })

  it('senha errada e email inexistente dão a mesma resposta', async () => {
    const user = await createUser(await createCondo())
    const wrong = await tryLogin(user.email, 'errada')
    const unknown = await tryLogin('ninguem@teste.com', PASSWORD)

    expect(wrong.status).toBe(401)
    expect(unknown.status).toBe(401)
    expect(await wrong.json()).toEqual(await unknown.json())
    expect(wrong.cookies.get(AUTH_COOKIE)).toBeUndefined()
  })

  it('corpo inválido → 400', async () => {
    expect((await login(jsonRequest('POST', { email: 'x', password: '' }))).status).toBe(400)
  })

  it('email é comparado sem diferenciar maiúsculas (digitado ou gravado)', async () => {
    const condo = await createCondo()
    const lower = await createUser(condo, 'admin', { email: 'ana@teste.com' })
    const legacy = await createUser(condo, 'zelador', { email: 'Beto@Teste.com' })

    expect((await sessionOf(await tryLogin('  ANA@Teste.com ', PASSWORD))).sub).toBe(lower._id.toString())
    expect((await sessionOf(await tryLogin('beto@teste.com', PASSWORD))).sub).toBe(legacy._id.toString())
  })

  it('usuário desativado não entra', async () => {
    const user = await createUser(await createCondo())
    await (await users()).updateOne({ _id: user._id }, { $set: { status_id: (await getStatus('deleted'))._id } })
    expect((await tryLogin(user.email, PASSWORD)).status).toBe(401)
  })

  describe('mesmo email em dois condomínios', () => {
    beforeEach(async () => {
      // dado legado: anterior ao índice único de email
      await ensureIndexes(await getDb())
      await (await users()).dropIndex('email_active_unique').catch(() => {})
    })

    it('saiu do A (desativado) e foi cadastrado no B → entra só no B', async () => {
      const [a, b] = [await createCondo('A'), await createCondo('B')]
      const old = await createUser(a, 'zelador', { email: 'ze@teste.com' })
      await (await users()).updateOne({ _id: old._id }, { $set: { status_id: (await getStatus('deleted'))._id } })
      const current = await createUser(b, 'zelador', { email: 'ze@teste.com' })

      const session = await sessionOf(await tryLogin('ze@teste.com', PASSWORD))
      expect(session.sub).toBe(current._id.toString())
      expect(session.condo_id).toBe(b._id.toString())
    })

    it('ativo nos dois com senhas diferentes → entra na conta da senha digitada', async () => {
      const [a, b] = [await createCondo('A'), await createCondo('B')]
      const inA = await createUser(a, 'zelador', { email: 'ze@teste.com', passwordHash: bcrypt.hashSync('senha-do-a-123', 4) })
      const inB = await createUser(b, 'sindico', { email: 'ze@teste.com', passwordHash: bcrypt.hashSync('senha-do-b-123', 4) })

      expect((await sessionOf(await tryLogin('ze@teste.com', 'senha-do-a-123'))).sub).toBe(inA._id.toString())
      const sessionB = await sessionOf(await tryLogin('ze@teste.com', 'senha-do-b-123'))
      expect(sessionB).toMatchObject({ sub: inB._id.toString(), condo_id: b._id.toString(), role: 'sindico' })
    })

    it('ativo nos dois com a mesma senha → vale a conta mais recente, nunca a antiga', async () => {
      const [a, b] = [await createCondo('A'), await createCondo('B')]
      await createUser(a, 'zelador', { email: 'ze@teste.com', created_at: new Date('2025-01-01') })
      const recent = await createUser(b, 'zelador', { email: 'ze@teste.com', created_at: new Date('2026-01-01') })

      const session = await sessionOf(await tryLogin('ze@teste.com', PASSWORD))
      expect(session.sub).toBe(recent._id.toString())
      expect(session.condo_id).toBe(b._id.toString())
    })
  })

  describe('rate limit', () => {
    it('5 falhas bloqueiam aquele email naquele IP, mesmo com a senha certa', async () => {
      const user = await createUser(await createCondo())
      for (let i = 0; i < 5; i++) expect((await tryLogin(user.email, 'errada')).status).toBe(401)
      expect((await tryLogin(user.email, PASSWORD)).status).toBe(429)
    })

    it('o bloqueio não atinge outro email nem outro IP', async () => {
      const condo = await createCondo()
      const [victim, colleague] = [await createUser(condo), await createUser(condo, 'porteiro')]
      for (let i = 0; i < 5; i++) await tryLogin(victim.email, 'errada')

      expect((await tryLogin(colleague.email, PASSWORD)).status).toBe(200)
      expect((await tryLogin(victim.email, PASSWORD, '10.9.9.9')).status).toBe(200)
    })

    it('login certo não consome tentativa e zera as falhas', async () => {
      const user = await createUser(await createCondo())
      for (let i = 0; i < 4; i++) await tryLogin(user.email, 'errada')
      for (let i = 0; i < 10; i++) expect((await tryLogin(user.email, PASSWORD)).status).toBe(200)
      for (let i = 0; i < 4; i++) expect((await tryLogin(user.email, 'errada')).status).toBe(401)
      expect((await tryLogin(user.email, PASSWORD)).status).toBe(200)
    })
  })
})

describe('logout', () => {
  it('DELETE /api/auth apaga o cookie', async () => {
    const res = await logoutRoute()
    expect(res.cookies.get(AUTH_COOKIE)).toMatchObject({ value: '', maxAge: 0 })
  })

  it('GET /api/auth/logout apaga o cookie e manda para /login', async () => {
    const res = await logoutRedirect(jsonRequest('GET', undefined, {}, 'http://localhost/api/auth/logout'))
    expect(new URL(res.headers.get('location')!).pathname).toBe('/login')
    expect(res.cookies.get(AUTH_COOKIE)).toMatchObject({ value: '', maxAge: 0 })
  })
})

describe('POST /api/register', () => {
  const body = { condoName: 'Residencial São José', name: 'Ana', email: 'Ana@Teste.com', password: 'senha-forte-123', acceptTerms: true }
  const post = (data: object, ip = '10.0.0.1') => register(jsonRequest('POST', data, { 'x-forwarded-for': ip }))

  it('cria condomínio novo + admin e já loga', async () => {
    const res = await post(body)
    expect(res.status).toBe(201)

    const user = await (await users()).findOne({ email: 'ana@teste.com' })
    const condo = await (await condominiums()).findOne({ _id: user!.condo_id })
    expect(condo).toMatchObject({ name: 'Residencial São José', slug: 'residencial-sao-jose' })
    expect(await bcrypt.compare(body.password, user!.password_hash)).toBe(true)
    expect(user).toMatchObject({ terms_version: TERMS_VERSION, terms_accepted_at: expect.any(Date) })
    expect(await sessionOf(res)).toMatchObject({ sub: user!._id.toString(), role: 'admin', condo_id: condo!._id.toString() })
  })

  it.each([
    ['ausente', { acceptTerms: undefined }],
    ['falso', { acceptTerms: false }],
    ['texto em vez de booleano', { acceptTerms: 'true' }],
  ])('sem aceite dos Termos e da Política (%s) nada é criado', async (_name, override) => {
    const res = await post({ ...body, ...override })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: TERMS_REQUIRED_MESSAGE })
    expect(await (await condominiums()).countDocuments({})).toBe(0)
    expect(await (await users()).countDocuments({})).toBe(0)
  })

  it('nunca vincula a pessoa a um condomínio existente de mesmo nome', async () => {
    const existing = await createCondo('Residencial São José')
    const res = await post(body)
    const session = await sessionOf(res)

    expect(session.condo_id).not.toBe(existing._id.toString())
    expect(await (await condominiums()).countDocuments({ name: 'Residencial São José' })).toBe(2)
    expect(await (await users()).countDocuments({ condo_id: existing._id })).toBe(0)
  })

  it('slug repetido ganha sufixo', async () => {
    await post(body)
    await post({ ...body, email: 'outra@teste.com' })
    const slugs = (await (await condominiums()).find({}).toArray()).map((c) => c.slug).sort()
    expect(slugs).toEqual(['residencial-sao-jose', 'residencial-sao-jose-2'])
  })

  it('email já ativo em qualquer condomínio → 409 e nada é criado', async () => {
    await createUser(await createCondo(), 'zelador', { email: 'ana@teste.com' })
    const res = await post(body)
    expect(res.status).toBe(409)
    expect(await (await condominiums()).countDocuments({})).toBe(1)
  })

  it.each([
    ['senha curta', { password: '1234567' }],
    ['email inválido', { email: 'x' }],
    ['nome de condomínio curto', { condoName: 'ab' }],
  ])('%s → 400', async (_name, override) => {
    expect((await post({ ...body, ...override })).status).toBe(400)
    expect(await (await condominiums()).countDocuments({})).toBe(0)
  })

  it('limita cadastros por IP', async () => {
    for (let i = 0; i < 5; i++) {
      expect((await post({ ...body, email: `a${i}@teste.com` })).status).toBe(201)
    }
    expect((await post({ ...body, email: 'a6@teste.com' })).status).toBe(429)
    expect((await post({ ...body, email: 'a7@teste.com' }, '10.9.9.9')).status).toBe(201)
  })
})

describe('recuperação de senha', () => {
  const hashOf = (token: string) => createHash('sha256').update(token).digest('hex')
  const sent = vi.mocked(sendEmail)
  const lastLink = () => /href="([^"]*reset-password\?token=([0-9a-f]{64}))"/.exec(sent.mock.calls.at(-1)![0].html)!

  beforeEach(() => {
    sent.mockClear()
  })

  it('forgot responde 200 exista ou não o email, e só envia quando existe', async () => {
    const user = await createUser(await createCondo(), 'admin', { email: 'ana@teste.com' })

    expect((await forgot(jsonRequest('POST', { email: 'ninguem@teste.com' }))).status).toBe(200)
    expect(sendEmail).not.toHaveBeenCalled()

    expect((await forgot(jsonRequest('POST', { email: 'ana@teste.com' }))).status).toBe(200)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(await (await passwordResetTokens()).countDocuments({ user_id: user._id })).toBe(1)
    expect((await forgot(jsonRequest('POST', { email: 'x' }))).status).toBe(400)
  })

  it('reset troca a senha uma única vez e derruba as sessões antigas', async () => {
    const user = await createUser(await createCondo())
    await (await passwordResetTokens()).insertOne({
      user_id: user._id,
      token_hash: hashOf('token-bom'),
      expires_at: new Date(Date.now() + 60_000),
    })

    expect((await reset(jsonRequest('POST', { token: 'token-bom', password: 'nova-senha-123' }))).status).toBe(200)
    const updated = await (await users()).findOne({ _id: user._id })
    expect(await bcrypt.compare('nova-senha-123', updated!.password_hash)).toBe(true)
    expect(updated!.password_changed_at).toBeInstanceOf(Date)

    expect((await reset(jsonRequest('POST', { token: 'token-bom', password: 'outra-senha-123' }))).status).toBe(400)
  })

  it('reset recusa token desconhecido, expirado ou senha curta', async () => {
    const user = await createUser(await createCondo())
    await (await passwordResetTokens()).insertOne({
      user_id: user._id,
      token_hash: hashOf('vencido'),
      expires_at: new Date(Date.now() - 1000),
    })

    expect((await reset(jsonRequest('POST', { token: 'nao-existe', password: 'nova-senha-123' }))).status).toBe(400)
    expect((await reset(jsonRequest('POST', { token: 'vencido', password: 'nova-senha-123' }))).status).toBe(400)
    expect((await reset(jsonRequest('POST', { token: 'vencido', password: 'curta' }))).status).toBe(400)
    expect((await (await users()).findOne({ _id: user._id }))!.password_changed_at).toBeUndefined()
  })

  it('forgot: só conta ativa recebe link, o link usa APP_URL e pedido novo invalida o anterior', async () => {
    const active = await createUser(await createCondo(), 'admin', { email: 'Ana@Teste.com' })
    const gone = await createUser(await createCondo(), 'zelador', { email: 'saiu@teste.com' })
    await (await users()).updateOne({ _id: gone._id }, { $set: { status_id: (await getStatus('deleted'))._id } })

    await forgot(jsonRequest('POST', { email: 'saiu@teste.com' }))
    expect(sent).not.toHaveBeenCalled()

    // Host do request forjado não entra no link
    await forgot(jsonRequest('POST', { email: 'ana@teste.com' }, {}, 'http://evil.com/api/auth/forgot'))
    const [, firstUrl, firstToken] = lastLink()
    expect(firstUrl).toBe(`http://localhost:3000/reset-password?token=${firstToken}`)

    await forgot(jsonRequest('POST', { email: 'ANA@teste.com' }))
    const [, , secondToken] = lastLink()
    expect(secondToken).not.toBe(firstToken)
    expect(await (await passwordResetTokens()).countDocuments({ user_id: active._id })).toBe(1)

    expect((await reset(jsonRequest('POST', { token: firstToken, password: 'nova-senha-123' }))).status).toBe(400)
    expect((await reset(jsonRequest('POST', { token: secondToken, password: 'nova-senha-123' }))).status).toBe(200)
  })

  it('forgot: falha de SMTP não muda a resposta', async () => {
    await createUser(await createCondo(), 'admin', { email: 'ana@teste.com' })
    sent.mockRejectedValueOnce(new Error('SMTP fora do ar'))
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect((await forgot(jsonRequest('POST', { email: 'ana@teste.com' }))).status).toBe(200)
    expect(log).toHaveBeenCalledWith('[forgot] envio falhou', expect.any(Error))
    log.mockRestore()
  })

  it('forgot: limita pedidos por IP mesmo trocando de email', async () => {
    for (let i = 0; i < 10; i++) await createUser(await createCondo(), 'admin', { email: `u${i}@teste.com` })
    const extra = await createUser(await createCondo(), 'admin', { email: 'extra@teste.com' })

    for (let i = 0; i < 10; i++) await forgot(jsonRequest('POST', { email: `u${i}@teste.com` }))
    expect(sent).toHaveBeenCalledTimes(10)

    expect((await forgot(jsonRequest('POST', { email: extra.email }))).status).toBe(200)
    expect(sent).toHaveBeenCalledTimes(10)
  })

  it('reset: conta desativada depois do pedido não troca a senha', async () => {
    const user = await createUser(await createCondo())
    await (await passwordResetTokens()).insertOne({
      user_id: user._id,
      token_hash: hashOf('token-bom'),
      expires_at: new Date(Date.now() + 60_000),
    })
    await (await users()).updateOne({ _id: user._id }, { $set: { status_id: (await getStatus('deleted'))._id } })

    expect((await reset(jsonRequest('POST', { token: 'token-bom', password: 'nova-senha-123' }))).status).toBe(400)
    expect(await bcrypt.compare(PASSWORD, (await (await users()).findOne({ _id: user._id }))!.password_hash)).toBe(true)
  })

  it('reset: registra audit log sem a senha e apaga outros links pendentes', async () => {
    const user = await createUser(await createCondo())
    const tokens = await passwordResetTokens()
    for (const t of ['a', 'b']) {
      await tokens.insertOne({ user_id: user._id, token_hash: hashOf(t), expires_at: new Date(Date.now() + 60_000) })
    }

    expect((await reset(jsonRequest('POST', { token: 'a', password: 'nova-senha-123' }))).status).toBe(200)
    expect((await reset(jsonRequest('POST', { token: 'b', password: 'outra-senha-123' }))).status).toBe(400)

    const log = await (await auditLogs()).findOne({ entity_id: user._id })
    expect(log).toMatchObject({ entity: 'users', action: 'updated', condo_id: user.condo._id, after: { password_reset: true } })
    expect(JSON.stringify(log)).not.toContain('nova-senha-123')
  })

  it('reset: limita tentativas por IP', async () => {
    for (let i = 0; i < 10; i++) {
      expect((await reset(jsonRequest('POST', { token: `chute-${i}`, password: 'nova-senha-123' }))).status).toBe(400)
    }
    expect((await reset(jsonRequest('POST', { token: 'chute-11', password: 'nova-senha-123' }))).status).toBe(429)
  })
})
