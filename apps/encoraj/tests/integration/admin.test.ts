import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ObjectId } from 'mongodb'

vi.mock('@/lib/gemini/ocr', () => ({ analyzePackageLabel: vi.fn() }))

import { PATCH as resolveError } from '@/app/api/admin/errors/[id]/route'
import { POST as ocr } from '@/app/api/ocr/route'
import { DELETE as eraseCondoRoute } from '@/app/api/condo/erase/route'
import { analyzePackageLabel, type OcrUsage } from '@/lib/gemini/ocr'
import { GET as listUsers, POST as createUserRoute } from '@/app/api/users/route'
import { PUT as updateUser, DELETE as deleteUser } from '@/app/api/users/[id]/route'
import { DELETE as eraseUserRoute } from '@/app/api/users/[id]/erase/route'
import { getSuperAdminSession } from '@/lib/auth/super-admin'
import { getSession } from '@/lib/auth/session'
import { getRole } from '@/lib/db/status-map'
import { userRoleNames } from '@/lib/auth/user-roles'
import { ERASE_CONFIRMATION } from '@/lib/lgpd/erase'
import { reportError } from '@/lib/observability/report'
import { aiPricing, getAiUsageReport, recordAiUsage } from '@/lib/ai/usage'
import { resolvePeriod } from '@/lib/reports/management'
import { aiUsage, condominiums, errorLogs, users } from '@/lib/db/collections'
import {
  ALL_ROLES,
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
  type TestCondo,
} from '../helpers/factory'

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('super admin', () => {
  it('é quem tem a role superadmin entre as suas roles', async () => {
    const owner = await createUser(await createCondo(), ['admin', 'superadmin'])
    await loginAs(owner)

    expect(await getSuperAdminSession()).toMatchObject({ userId: owner._id.toString() })
    expect((await getSession())!.roles.sort()).toEqual(['admin', 'superadmin'])
    expect((await listUsers()).status).toBe(200) // vem da role admin, que ele também tem
  })

  it('superadmin sozinha já pode tudo no condomínio em que está, sem precisar da role admin', async () => {
    await loginAs(await createUser(await createCondo(), 'superadmin'))

    expect(await getSuperAdminSession()).not.toBeNull()
    expect((await listUsers()).status).toBe(200)
  })

  it.each(ALL_ROLES)('role %s não é super admin', async (role) => {
    await loginAs(await createUser(await createCondo(), role))
    expect(await getSuperAdminSession()).toBeNull()
  })

  it('sem login não há super admin', async () => {
    expect(await getSuperAdminSession()).toBeNull()
  })

  it('tirou a role no banco, perde o acesso na hora — e quem ganha precisa entrar de novo', async () => {
    const adminId = (await getRole('admin'))._id
    const superId = (await getRole('superadmin'))._id

    const owner = await createUser(await createCondo(), ['admin', 'superadmin'])
    await loginAs(owner)
    await (await users()).updateOne({ _id: owner._id }, { $set: { role_ids: [adminId] } })
    expect(await getSession()).toBeNull() // token ainda diz superadmin; o banco não

    const admin = await createUser(await createCondo(), 'admin')
    await loginAs(admin)
    await (await users()).updateOne({ _id: admin._id }, { $set: { role_ids: [adminId, superId] } })
    expect(await getSuperAdminSession()).toBeNull() // token antigo não ganha a role sozinho
  })

  it('token forjado com a role superadmin não passa: quem manda é o banco', async () => {
    const admin = await createUser(await createCondo(), 'admin')
    await loginAs({ ...admin, roles: ['admin', 'superadmin'] })
    expect(await getSuperAdminSession()).toBeNull()
  })
})

describe('a role superadmin não entra nem sai pela API de usuários', () => {
  const edit = (id: ObjectId, body: unknown) => updateUser(jsonRequest('PUT', body), routeCtx(id))
  const rolesOf = async (id: ObjectId) => (await userRoleNames((await (await users()).findOne({ _id: id }))!)).sort()

  it('não pode ser atribuída ao criar nem ao editar — nem por um super admin', async () => {
    const condo = await createCondo()
    const target = await createUser(condo, 'porteiro')
    const body = { name: 'Esperto', email: 'esperto@teste.com', password: 'senha-forte-123' }

    for (const actor of [await createUser(condo, 'admin'), await createUser(condo, ['admin', 'superadmin'])]) {
      await loginAs(actor)
      expect((await createUserRoute(jsonRequest('POST', { ...body, roles: ['superadmin'] }))).status).toBe(400)
      expect((await createUserRoute(jsonRequest('POST', { ...body, roles: ['admin', 'superadmin'] }))).status).toBe(400)
      expect((await edit(target._id, { roles: ['porteiro', 'superadmin'] })).status).toBe(400)
    }
    expect(await rolesOf(target._id)).toEqual(['porteiro'])
    expect(await (await users()).countDocuments({ email: 'esperto@teste.com' })).toBe(0)
  })

  it('admin do condomínio não edita, não desativa e não remove quem é super admin', async () => {
    const condo = await createCondo()
    const owner = await createUser(condo, ['admin', 'superadmin'])
    await loginAs(await createUser(condo, 'admin'))

    expect((await edit(owner._id, { name: 'Invadido', roles: ['porteiro'], password: 'senha-nova-123' })).status).toBe(403)
    expect((await deleteUser(jsonRequest('DELETE'), routeCtx(owner._id))).status).toBe(403)
    expect((await eraseUserRoute(jsonRequest('DELETE', { confirm: ERASE_CONFIRMATION }), routeCtx(owner._id))).status).toBe(403)

    const doc = (await (await users()).findOne({ _id: owner._id }))!
    expect(doc.name).toBe(owner.name)
    expect(doc.deleted_at).toBeUndefined()
    expect(await rolesOf(owner._id)).toEqual(['admin', 'superadmin'])
  })

  it('editar as roles de condomínio de um super admin nunca derruba a role dele', async () => {
    const owner = await createUser(await createCondo(), ['admin', 'superadmin'])
    await loginAs(owner)

    expect((await edit(owner._id, { name: 'Novo Nome', roles: ['admin', 'sindico'] })).status).toBe(200)
    expect((await (await users()).findOne({ _id: owner._id }))!.name).toBe('Novo Nome')
    expect(await rolesOf(owner._id)).toEqual(['admin', 'sindico', 'superadmin'])
  })

  it('um super admin pode desativar e remover outro do mesmo condomínio', async () => {
    const condo = await createCondo()
    const me = await createUser(condo, ['admin', 'superadmin'])
    const [other, third] = [await createUser(condo, ['admin', 'superadmin']), await createUser(condo, 'superadmin')]
    await loginAs(me)

    expect((await deleteUser(jsonRequest('DELETE'), routeCtx(other._id))).status).toBe(200)
    expect((await eraseUserRoute(jsonRequest('DELETE', { confirm: ERASE_CONFIRMATION }), routeCtx(third._id))).status).toBe(200)
    expect(await (await users()).findOne({ _id: third._id })).toBeNull()
  })
})

describe('erros guardados para /admin/errors', () => {
  it('o mesmo erro vira um registro só, com contador, mascarado', async () => {
    const error = new Error('E11000 duplicate key: { email: "maria@condominio.com" }')
    await reportError('[POST /api/users]', error, { condoId: '507f1f77bcf86cd799439011', vazio: undefined })
    await reportError('[POST /api/users]', new Error('E11000 duplicate key: { email: "joao@condominio.com" }'))
    await reportError('[GET /api/users]', new Error('outra coisa'))

    const docs = await (await errorLogs()).find({}).sort({ count: -1 }).toArray()
    expect(docs).toHaveLength(2)
    expect(docs[0]).toMatchObject({
      label: '[POST /api/users]',
      name: 'Error',
      message: 'E11000 duplicate key: { email: "[email]" }',
      count: 2,
      env: 'test',
    })
    expect(docs[0].first_at.getTime()).toBeLessThanOrEqual(docs[0].last_at.getTime())
    expect(docs[0].stack).toContain('Error: E11000')
    expect(JSON.stringify(docs)).not.toMatch(/maria|joao/)
  })

  it('valor que não é Error é guardado sem pilha; contexto vazio some', async () => {
    await reportError('[tela]', 'texto solto', { digest: undefined })
    const doc = (await (await errorLogs()).findOne({}))!
    expect(doc).toMatchObject({ name: 'Erro', message: 'texto solto', extra: {}, count: 1 })
    expect(doc.stack).toBeUndefined()
  })

  it('erro resolvido que volta a acontecer é reaberto', async () => {
    await reportError('[x]', new Error('falha'))
    const col = await errorLogs()
    await col.updateOne({}, { $set: { resolved_at: new Date(), resolved_by: new ObjectId() } })

    await reportError('[x]', new Error('falha'))
    const doc = (await col.findOne({}))!
    expect(doc.count).toBe(2)
    expect(doc.resolved_at).toBeUndefined()
    expect(doc.resolved_by).toBeUndefined()
  })

  it('banco indisponível não derruba quem reportou', async () => {
    const collections = await import('@/lib/db/collections')
    vi.spyOn(collections, 'errorLogs').mockRejectedValueOnce(new Error('sem conexão'))

    await expect(reportError('[x]', new Error('falha'))).resolves.toBeUndefined()
    expect(console.error).toHaveBeenCalledWith('[registro de erro falhou]', expect.any(Error))
  })
})

describe('PATCH /api/admin/errors/[id]', () => {
  async function scenario() {
    await reportError('[x]', new Error('falha'))
    const doc = (await (await errorLogs()).findOne({}))!
    const owner = await createUser(await createCondo(), ['admin', 'superadmin'])
    return { id: doc._id, owner }
  }
  const patch = (id: ObjectId | string, body: unknown) => resolveError(jsonRequest('PATCH', body), routeCtx(id))

  it('super admin resolve e reabre', async () => {
    const { id, owner } = await scenario()
    await loginAs(owner)

    expect((await patch(id, { resolved: true })).status).toBe(200)
    const resolved = (await (await errorLogs()).findOne({ _id: id }))!
    expect(resolved.resolved_at).toBeInstanceOf(Date)
    expect(resolved.resolved_by).toEqual(owner._id)

    expect((await patch(id, { resolved: false })).status).toBe(200)
    expect((await (await errorLogs()).findOne({ _id: id }))!.resolved_at).toBeUndefined()
  })

  it('admin de condomínio não é super admin: 403 e nada muda', async () => {
    const { id } = await scenario()
    await loginAs(await createUser(await createCondo(), 'admin'))

    expect((await patch(id, { resolved: true })).status).toBe(403)
    expect((await (await errorLogs()).findOne({ _id: id }))!.resolved_at).toBeUndefined()
  })

  it('id inválido, corpo inválido e erro inexistente', async () => {
    const { id, owner } = await scenario()
    await loginAs(owner)

    expect((await patch('abc', { resolved: true })).status).toBe(400)
    expect((await patch(id, { resolved: 'sim' })).status).toBe(400)
    expect((await patch(id, undefined)).status).toBe(400)
    expect((await patch(new ObjectId(), { resolved: true })).status).toBe(404)
  })
})

describe('uso de IA', () => {
  const usage = (over: Partial<OcrUsage> = {}): OcrUsage => ({
    model: 'gemini-2.0-flash',
    outcome: 'matched',
    confidence: 'high',
    promptTokens: 1000,
    outputTokens: 50,
    totalTokens: 1050,
    latencyMs: 2000,
    ...over,
  })

  async function call(condo: TestCondo, when: string, over: Partial<OcrUsage> = {}, imageBytes = 204_800) {
    await recordAiUsage({ condoId: condo._id.toString(), userId: new ObjectId().toString(), imageBytes, usage: usage(over) })
    const col = await aiUsage()
    const last = (await col.find({}).sort({ _id: -1 }).limit(1).toArray())[0]
    await col.updateOne({ _id: last._id }, { $set: { created_at: new Date(when) } })
  }

  const MARCH = resolvePeriod({ from: '2026-03-01', to: '2026-03-31' })

  it('grava a chamada sem texto nem imagem', async () => {
    const condo = await createCondo()
    await recordAiUsage({ condoId: condo._id.toString(), userId: new ObjectId().toString(), imageBytes: 1234, usage: usage() })
    await recordAiUsage({ condoId: condo._id.toString(), userId: new ObjectId().toString(), imageBytes: 1, usage: usage({ outcome: 'error', confidence: undefined }) })

    const docs = await (await aiUsage()).find({}).sort({ _id: 1 }).toArray()
    expect(docs[0]).toMatchObject({
      condo_id: condo._id,
      feature: 'ocr',
      model: 'gemini-2.0-flash',
      outcome: 'matched',
      confidence: 'high',
      prompt_tokens: 1000,
      output_tokens: 50,
      total_tokens: 1050,
      latency_ms: 2000,
      image_bytes: 1234,
    })
    expect(docs[1].confidence).toBeUndefined()
    expect(Object.keys(docs[0]).sort()).toEqual(
      ['_id', 'condo_id', 'confidence', 'created_at', 'feature', 'image_bytes', 'latency_ms', 'model', 'outcome', 'output_tokens', 'prompt_tokens', 'total_tokens', 'user_id'],
    )
  })

  it('falha ao gravar não derruba a leitura da etiqueta', async () => {
    await expect(recordAiUsage({ condoId: 'id-invalido', userId: 'x', imageBytes: 1, usage: usage() })).resolves.toBeUndefined()
    expect(await (await aiUsage()).countDocuments({})).toBe(0)
    expect(console.error).toHaveBeenCalledWith('[uso de IA]', expect.any(Error))
  })

  it('preço vem do ambiente; sem ele (ou inválido) não há custo', () => {
    expect(aiPricing()).toBeNull()

    vi.stubEnv('AI_PRICE_INPUT_USD_PER_MTOK', '0,10')
    expect(aiPricing()).toBeNull() // falta o de saída
    vi.stubEnv('AI_PRICE_OUTPUT_USD_PER_MTOK', '0.40')
    expect(aiPricing()).toEqual({ inputPerMillion: 0.1, outputPerMillion: 0.4 })

    vi.stubEnv('AI_PRICE_OUTPUT_USD_PER_MTOK', 'grátis')
    expect(aiPricing()).toBeNull()
    vi.stubEnv('AI_PRICE_OUTPUT_USD_PER_MTOK', '-1')
    expect(aiPricing()).toBeNull()
  })

  it('período sem chamadas: tudo zerado', async () => {
    const report = await getAiUsageReport(MARCH)
    expect(report.totals).toMatchObject({
      calls: 0,
      matchPct: null,
      avgLatencyMs: null,
      maxLatencyMs: null,
      avgImageKb: null,
      costUsd: null,
      costPerCallUsd: null,
    })
    expect(report.byDay).toHaveLength(31)
    expect(report).toMatchObject({ truncated: false, pricing: null, byModel: [], byCondo: [] })
  })

  it('soma chamadas, resultados, tokens, tempo e custo — de todos os condomínios', async () => {
    vi.stubEnv('AI_PRICE_INPUT_USD_PER_MTOK', '0.10')
    vi.stubEnv('AI_PRICE_OUTPUT_USD_PER_MTOK', '0.40')
    const [sol, lua] = [await createCondo('Edifício Sol'), await createCondo('Edifício Lua')]
    const gone = await createCondo('Vai Sumir')

    await call(sol, '2026-03-02T13:00:00Z')
    await call(sol, '2026-03-02T14:00:00Z', { outcome: 'no_match', confidence: undefined, latencyMs: 4000 })
    await call(sol, '2026-03-03T13:00:00Z', { outcome: 'error', confidence: undefined, promptTokens: 0, outputTokens: 0, totalTokens: 0, latencyMs: 9000 })
    await call(lua, '2026-03-03T02:30:00Z', { model: 'modelo-novo' }) // 23h30 do dia 02 em São Paulo
    await call(gone, '2026-03-10T13:00:00Z', { outcome: 'invalid_response', confidence: undefined })
    await call(sol, '2026-01-10T13:00:00Z') // fora do período
    await (await condominiums()).deleteOne({ _id: gone._id })

    const report = await getAiUsageReport(MARCH)

    expect(report.totals).toMatchObject({
      calls: 5,
      matched: 2,
      matchPct: 40,
      byOutcome: { matched: 2, no_match: 1, invalid_response: 1, error: 1, disabled: 0 },
      promptTokens: 4000,
      outputTokens: 200,
      totalTokens: 4200,
      avgLatencyMs: 3800, // (2000 + 4000 + 9000 + 2000 + 2000) / 5
      maxLatencyMs: 9000,
      avgImageKb: 200,
    })
    // 4000 × 0,10 + 200 × 0,40 = 480 por milhão
    expect(report.totals.costUsd).toBeCloseTo(0.00048, 10)
    expect(report.totals.costPerCallUsd).toBeCloseTo(0.000096, 10)

    const day = (date: string) => report.byDay.find((d) => d.date === date)
    expect(day('2026-03-02')).toEqual({ date: '2026-03-02', calls: 3, failures: 0, totalTokens: 3150 })
    expect(day('2026-03-03')).toEqual({ date: '2026-03-03', calls: 1, failures: 1, totalTokens: 0 })
    expect(day('2026-03-10')).toMatchObject({ calls: 1, failures: 1 })

    expect(report.byModel.map((m) => [m.model, m.calls])).toEqual([
      ['gemini-2.0-flash', 4],
      ['modelo-novo', 1],
    ])
    expect(report.byCondo.map((c) => [c.name, c.calls, c.matched])).toEqual([
      ['Edifício Sol', 3, 1],
      ['Condomínio removido', 1, 0],
      ['Edifício Lua', 1, 1],
    ])
    expect(report.byCondo[0].costUsd).toBeCloseTo((2000 * 0.1 + 100 * 0.4) / 1_000_000, 10)
  })

  it('a rota de OCR registra o uso com condomínio, usuário e tamanho da imagem', async () => {
    const condo = await createCondo()
    const porteiro = await createUser(condo, 'porteiro')
    await createResident(condo, 'Ana')
    await loginAs(porteiro)
    vi.mocked(analyzePackageLabel).mockImplementationOnce(async (_image, _mime, _residents, onUsage) => {
      onUsage?.(usage({ outcome: 'no_match', confidence: undefined }))
      return null
    })

    await ocr(formRequest(imageForm(JPEG)))

    const docs = await (await aiUsage()).find({}).toArray()
    expect(docs).toHaveLength(1)
    expect(docs[0]).toMatchObject({ condo_id: condo._id, user_id: porteiro._id, outcome: 'no_match', image_bytes: JPEG.length })
  })

  it('remover o condomínio apaga também o uso de IA dele', async () => {
    const [mine, other] = [await createCondo('Edifício Sol'), await createCondo('Edifício Lua')]
    await call(mine, '2026-03-02T13:00:00Z')
    await call(other, '2026-03-02T13:00:00Z')
    await loginAs(await createUser(mine, 'admin'))
    vi.spyOn(console, 'info').mockImplementation(() => {})

    const res = await eraseCondoRoute(jsonRequest('DELETE', { confirm: 'Edifício Sol', password: PASSWORD }))
    expect(res.status).toBe(200)

    const left = await (await aiUsage()).find({}).toArray()
    expect(left.map((d) => d.condo_id.toString())).toEqual([other._id.toString()])
  })
})
