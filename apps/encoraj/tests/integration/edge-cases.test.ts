import { describe, expect, it, vi } from 'vitest'
import { ObjectId } from 'mongodb'

vi.mock('@/lib/email/mailer', () => ({ sendEmail: vi.fn(async () => {}) }))
vi.mock('@/lib/gemini/ocr', () => ({ analyzePackageLabel: vi.fn() }))

import { POST as login } from '@/app/api/auth/route'
import { POST as register } from '@/app/api/register/route'
import { POST as forgot } from '@/app/api/auth/forgot/route'
import { GET as getCondo, PUT as updateCondo } from '@/app/api/condo/route'
import { POST as ocr } from '@/app/api/ocr/route'
import { PUT as updateResident } from '@/app/api/residents/[id]/route'
import { PUT as updateUser, DELETE as deleteUser } from '@/app/api/users/[id]/route'
import { sendEmail } from '@/lib/email/mailer'
import { analyzePackageLabel } from '@/lib/gemini/ocr'
import { getSession, readSession } from '@/lib/auth/session'
import { signToken, verifyToken, type JwtPayload } from '@/lib/auth/jwt'
import { AUTH_COOKIE } from '@/lib/auth/cookies'
import { getDb } from '@/lib/db/client'
import { condominiums, residents, users } from '@/lib/db/collections'
import { getRole, getRoleById, getStatus, getStatusById } from '@/lib/db/status-map'
import {
  createCondo,
  createResident,
  createUser,
  formRequest,
  imageForm,
  JPEG,
  jsonRequest,
  loginAs,
  PASSWORD,
  routeCtx,
} from '../helpers/factory'
import { requestState } from '../helpers/request-state'

const tryLogin = (email: string) => login(jsonRequest('POST', { email, password: PASSWORD }))

describe('login — dados inconsistentes no banco', () => {
  it('leva as fotos do usuário e do condomínio para o token', async () => {
    const condo = await createCondo()
    const user = await createUser(condo)
    await (await users()).updateOne({ _id: user._id }, { $set: { photo_url: 'https://x/u.jpg' } })
    await (await condominiums()).updateOne({ _id: condo._id }, { $set: { photo_url: 'https://x/c.jpg' } })

    const res = await tryLogin(user.email)
    expect(await verifyToken(res.cookies.get(AUTH_COOKIE)!.value)).toMatchObject({
      photo_url: 'https://x/u.jpg',
      condo_photo_url: 'https://x/c.jpg',
    })
  })

  it('usuário sem condomínio → 403', async () => {
    const user = await createUser(await createCondo())
    await (await getDb()).collection('users').updateOne({ _id: user._id }, { $unset: { condo_id: '' } })
    expect((await tryLogin(user.email)).status).toBe(403)
  })

  it('role ou condomínio inexistente → 500, sem cookie', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const noRole = await createUser(await createCondo())
    await (await users()).updateOne({ _id: noRole._id }, { $set: { role_id: new ObjectId() } })
    const noCondo = await createUser(await createCondo())
    await (await users()).updateOne({ _id: noCondo._id }, { $set: { condo_id: new ObjectId() } })

    for (const user of [noRole, noCondo]) {
      const res = await tryLogin(user.email)
      expect(res.status).toBe(500)
      expect(res.cookies.get(AUTH_COOKIE)).toBeUndefined()
    }
  })
})

describe('sessão — token estranho', () => {
  const base: JwtPayload = { sub: '', name: 'x', role: 'admin', condo_id: '', condo_name: 'x' }
  const use = async (payload: Partial<JwtPayload>) => {
    requestState.cookies.set(AUTH_COOKIE, await signToken({ ...base, ...payload } as JwtPayload))
  }
  const ids = { sub: new ObjectId().toString(), condo_id: new ObjectId().toString() }

  it('recusa token sem identidade ou com id malformado', async () => {
    await use({ ...ids, role: '' })
    expect(await readSession()).toBeNull()
    await use({ sub: 'abc', condo_id: ids.condo_id })
    expect(await readSession()).toBeNull()
    await use({ sub: ids.sub, condo_id: 'abc' })
    expect(await readSession()).toBeNull()
  })

  it('token sem nome nem nome do condomínio vira string vazia', async () => {
    await use({ ...ids, name: undefined, condo_name: undefined })
    expect(await readSession()).toMatchObject({ userName: '', condoName: '' })
  })

  it('usuário com role inexistente no banco → sem sessão', async () => {
    const user = await createUser(await createCondo())
    await loginAs(user)
    await (await users()).updateOne({ _id: user._id }, { $set: { role_id: new ObjectId() } })
    expect(await getSession()).toBeNull()
  })
})

describe('status-map', () => {
  const clearCache = () => {
    globalThis.__statusByName = undefined
    globalThis.__statusById = undefined
    globalThis.__roleByName = undefined
    globalThis.__roleById = undefined
  }

  it('busca por id no banco quando não está em cache, e depois reaproveita', async () => {
    const active = await getStatus('active')
    const admin = await getRole('admin')
    clearCache()

    expect(await getStatusById(active._id)).toEqual(active)
    expect(await getRoleById(admin._id)).toEqual(admin)
    // segunda chamada vem do cache, inclusive pela outra chave
    expect(await getStatus('active')).toBe(await getStatusById(active._id))
    expect(await getRole('admin')).toBe(await getRoleById(admin._id))
  })

  it('nome ou id desconhecido lança erro', async () => {
    clearCache()
    await expect(getStatus('nao-existe')).rejects.toThrow('Status not found')
    await expect(getRole('nao-existe')).rejects.toThrow('Role not found')
    await expect(getStatusById(new ObjectId())).rejects.toThrow('Status not found')
    await expect(getRoleById(new ObjectId())).rejects.toThrow('Role not found')
  })
})

describe('cadastro e recuperação — casos de borda', () => {
  it('nome de condomínio sem letra latina ganha slug padrão', async () => {
    const res = await register(
      jsonRequest('POST', { condoName: '日本語マンション', name: 'Ana', email: 'ana@teste.com', password: 'senha-forte-123', acceptTerms: true }),
    )
    expect(res.status).toBe(201)
    expect((await (await condominiums()).findOne({ name: '日本語マンション' }))!.slug).toBe('condominio')
  })

  it('forgot: limite por email é silencioso e condomínio ausente usa nome padrão', async () => {
    const user = await createUser(await createCondo(), 'admin', { email: 'ana@teste.com' })
    await (await users()).updateOne({ _id: user._id }, { $set: { condo_id: new ObjectId() } })
    const send = vi.mocked(sendEmail)
    send.mockClear()

    for (let i = 0; i < 5; i++) {
      expect((await forgot(jsonRequest('POST', { email: 'ana@teste.com' }))).status).toBe(200)
    }
    expect(send).toHaveBeenCalledTimes(3) // 4ª e 5ª tentativas: 200, mas nada enviado
    expect(send.mock.calls[0][0].html).toContain('Encoraj')
  })
})

describe('rotas — respostas 4xx restantes', () => {
  it('condomínio da sessão apagado → 404', async () => {
    const condo = await createCondo()
    await loginAs(await createUser(condo, 'admin'))
    await (await condominiums()).deleteOne({ _id: condo._id })

    expect((await getCondo()).status).toBe(404)
    expect((await updateCondo(jsonRequest('PUT', { name: 'Novo Nome' }))).status).toBe(404)
  })

  it('corpo inválido em edição de morador e de usuário → 400', async () => {
    const condo = await createCondo()
    const admin = await createUser(condo, 'admin')
    const target = await createUser(condo, 'porteiro')
    const resident = await createResident(condo)
    await loginAs(admin)

    expect((await updateResident(jsonRequest('PUT', { name: 'A' }), routeCtx(resident._id))).status).toBe(400)
    expect((await updateUser(jsonRequest('PUT', { email: 'x' }), routeCtx(target._id))).status).toBe(400)
    expect((await deleteUser(jsonRequest('DELETE'), routeCtx('abc'))).status).toBe(400)
    expect((await (await residents()).findOne({ _id: resident._id }))!.name).toBe(resident.name)
  })

  it('OCR monta o rótulo de morador sem bloco', async () => {
    const condo = await createCondo()
    const resident = await createResident(condo, 'Ana')
    await (await residents()).updateOne({ _id: resident._id }, { $unset: { bloco: '' } })
    await loginAs(await createUser(condo, 'porteiro'))
    vi.mocked(analyzePackageLabel).mockResolvedValueOnce({
      resident_id: resident._id.toString(),
      confidence: 'medium',
      extracted_text: 'Ana',
    })

    const body = await (await ocr(formRequest(imageForm(JPEG)))).json()
    expect(body.match.label).toBe('Ana — Apto 101')
  })
})
