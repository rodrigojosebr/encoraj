import { afterEach, describe, expect, it, vi } from 'vitest'
import { ObjectId } from 'mongodb'
import { GET as exportCsv } from '@/app/api/reports/export/route'
import { buildPackageFilter } from '@/lib/packages/filter'
import { packages, residents } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { paginate } from '@/lib/pagination'
import {
  createCondo,
  createPackage,
  createResident,
  createUser,
  jsonRequest,
  loginAs,
  type TestCondo,
} from '../helpers/factory'

async function setStatus(id: ObjectId, status: string, dates: Record<string, Date> = {}) {
  await (await packages()).updateOne({ _id: id }, { $set: { status_id: (await getStatus(status))._id, ...dates } })
}

async function arrivedAt(id: ObjectId, iso: string) {
  await (await packages()).updateOne({ _id: id }, { $set: { arrived_at: new Date(iso) } })
}

/** Códigos das encomendas que o filtro devolve, em ordem estável */
async function codes(condo: TestCondo, params: Parameters<typeof buildPackageFilter>[1], searchCode = true) {
  const filter = await buildPackageFilter(condo._id.toString(), params, { searchCode })
  const docs = await (await packages()).find(filter).toArray()
  return docs.map((d) => d.code).sort()
}

afterEach(() => {
  vi.useRealTimers()
})

describe('buildPackageFilter', () => {
  it('nunca sai do condomínio, com ou sem filtros', async () => {
    const [a, b] = [await createCondo(), await createCondo()]
    const mine = await createPackage(a, (await createResident(a, 'Maria'))._id)
    await createPackage(b, (await createResident(b, 'Maria'))._id)

    expect(await codes(a, {})).toEqual([mine.code])
    expect(await codes(a, { q: 'maria' })).toEqual([mine.code])
    expect(await codes(a, { q: 'PKG' })).toEqual([mine.code])
    expect(await codes(a, { status: 'open' })).toEqual([mine.code])
  })

  it('status: open, específico e desconhecido (ignorado)', async () => {
    const condo = await createCondo()
    const resident = await createResident(condo)
    const arrived = await createPackage(condo, resident._id)
    const notified = await createPackage(condo, resident._id)
    const delivered = await createPackage(condo, resident._id)
    await setStatus(notified._id, 'notified')
    await setStatus(delivered._id, 'delivered')
    const all = [arrived.code, notified.code, delivered.code].sort()

    expect(await codes(condo, { status: 'open' })).toEqual([arrived.code, notified.code].sort())
    expect(await codes(condo, { status: 'delivered' })).toEqual([delivered.code])
    expect(await codes(condo, { status: 'active' })).toEqual(all)
    expect(await codes(condo, { status: '{"$ne":null}' })).toEqual(all)
  })

  it('period=today usa a data de chegada — ou de retirada, quando o status é delivered', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-03-18T15:00:00.000Z')) // 12h do dia 18 em São Paulo
    const condo = await createCondo()
    const resident = await createResident(condo)
    const today = await createPackage(condo, resident._id)
    const yesterday = await createPackage(condo, resident._id)
    const lateLastNight = await createPackage(condo, resident._id)
    await arrivedAt(yesterday._id, '2026-03-17T15:00:00.000Z')
    await arrivedAt(lateLastNight._id, '2026-03-18T02:30:00.000Z') // 23h30 do dia 17 em São Paulo
    await setStatus(yesterday._id, 'delivered', { delivered_at: new Date('2026-03-18T14:00:00.000Z') })

    expect(await codes(condo, { period: 'today' })).toEqual([today.code])
    expect(await codes(condo, { period: 'today', status: 'delivered' })).toEqual([yesterday.code])
  })

  it('from/to são inclusivos no fuso de São Paulo; data malformada é ignorada', async () => {
    const condo = await createCondo()
    const resident = await createResident(condo)
    const [d16, d17, d18] = [
      await createPackage(condo, resident._id),
      await createPackage(condo, resident._id),
      await createPackage(condo, resident._id),
    ]
    await arrivedAt(d16._id, '2026-03-16T15:00:00.000Z')
    await arrivedAt(d17._id, '2026-03-18T02:59:00.000Z') // 23h59 do dia 17
    await arrivedAt(d18._id, '2026-03-18T03:00:00.000Z') // 00h00 do dia 18
    const all = [d16.code, d17.code, d18.code].sort()

    expect(await codes(condo, { from: '2026-03-17', to: '2026-03-17' })).toEqual([d17.code])
    expect(await codes(condo, { from: '2026-03-17' })).toEqual([d17.code, d18.code].sort())
    expect(await codes(condo, { to: '2026-03-16' })).toEqual([d16.code])
    expect(await codes(condo, { from: 'ontem', to: '17/03/2026' })).toEqual(all)
  })

  it('q: nome do morador sempre; código só com searchCode; regex é literal', async () => {
    const condo = await createCondo()
    const ana = await createPackage(condo, (await createResident(condo, 'Ana Souza'))._id)
    const bia = await createPackage(condo, (await createResident(condo, 'Bia Lima'))._id)
    const anaCode = ana.code.slice(-4).toLowerCase()

    expect(await codes(condo, { q: '  souza ' })).toEqual([ana.code])
    expect(await codes(condo, { q: anaCode })).toEqual([ana.code])
    expect(await codes(condo, { q: anaCode }, false)).toEqual([])
    expect(await codes(condo, { q: 'lima' }, false)).toEqual([bia.code])
    expect(await codes(condo, { q: 'ninguém' })).toEqual([])
    expect(await codes(condo, { q: '.*' })).toEqual([])
    expect(await codes(condo, { q: '   ' })).toEqual([ana.code, bia.code].sort())
  })

  it('combina com a paginação sem repetir nem pular encomenda', async () => {
    const condo = await createCondo()
    const resident = await createResident(condo)
    for (let i = 0; i < 7; i++) {
      const pkg = await createPackage(condo, resident._id)
      await arrivedAt(pkg._id, `2026-03-${10 + i}T15:00:00.000Z`)
    }
    const filter = await buildPackageFilter(condo._id.toString(), {}, { searchCode: true })
    const col = await packages()
    const total = await col.countDocuments(filter)

    const seen: string[] = []
    for (let page = 1; page <= 3; page++) {
      const { skip, pageSize } = paginate(total, page, 3)
      const docs = await col.find(filter).sort({ arrived_at: -1 }).skip(skip).limit(pageSize).toArray()
      seen.push(...docs.map((d) => d.code))
    }
    expect(seen).toHaveLength(7)
    expect(new Set(seen).size).toBe(7)
  })
})

describe('GET /api/reports/export', () => {
  const download = (query = '') =>
    exportCsv(jsonRequest('GET', undefined, {}, `http://localhost/api/reports/export${query}`))

  it('devolve CSV com BOM, cabeçalho e as encomendas do próprio condomínio', async () => {
    const [mine, other] = [await createCondo(), await createCondo()]
    const resident = await createResident(mine, 'Ana "Aninha" Souza')
    const pkg = await createPackage(mine, resident._id)
    await arrivedAt(pkg._id, '2026-03-17T15:00:00.000Z')
    await setStatus(pkg._id, 'delivered', {
      notified_at: new Date('2026-03-17T16:00:00.000Z'),
      delivered_at: new Date('2026-03-17T18:30:00.000Z'),
    })
    await createPackage(other, (await createResident(other, 'Morador de Outro Condomínio'))._id)
    await loginAs(await createUser(mine, 'sindico'))

    const res = await download()
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/csv; charset=utf-8')
    expect(res.headers.get('content-disposition')).toMatch(/^attachment; filename="encomendas-\d{4}-\d{2}-\d{2}\.csv"$/)

    const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(await res.arrayBuffer())
    expect(text.charCodeAt(0)).toBe(0xfeff)
    const lines = text.slice(1).split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toBe('"Código";"Morador";"Apartamento";"Status";"Chegada";"Notificado";"Retirado"')
    expect(lines[1]).toBe(
      `"${pkg.code}";"Ana ""Aninha"" Souza";"A, Apto 101";"Retirado";"17/03/2026, 12:00:00";"17/03/2026, 13:00:00";"17/03/2026, 15:30:00"`,
    )
    expect(text).not.toMatch(/delivery_pin|public_token|Outro Condomínio/)
  })

  it('aplica os filtros da URL e exporta todas as páginas', async () => {
    const condo = await createCondo()
    const ana = await createResident(condo, 'Ana')
    const bia = await createResident(condo, 'Bia')
    for (let i = 0; i < 30; i++) await createPackage(condo, ana._id)
    const delivered = await createPackage(condo, bia._id)
    await setStatus(delivered._id, 'delivered')
    await loginAs(await createUser(condo, 'admin'))
    const rows = async (query: string) => (await (await download(query)).text()).split('\n').length - 1

    expect(await rows('')).toBe(31) // mais que uma página da tela (25)
    expect(await rows('?status=open')).toBe(30)
    expect(await rows('?status=delivered')).toBe(1)
    expect(await rows('?q=bia')).toBe(1)
    expect(await rows('?q=ninguem')).toBe(0)
  })

  it('morador sem bloco, encomenda sem datas e fórmula no nome', async () => {
    const condo = await createCondo()
    const resident = await createResident(condo, '=HYPERLINK("http://evil")')
    await (await residents()).updateOne({ _id: resident._id }, { $unset: { bloco: '' } })
    await createPackage(condo, resident._id)
    const noResident = await createPackage(condo, new ObjectId()) // morador que não existe mais
    await loginAs(await createUser(condo, 'admin'))

    const text = await (await download()).text()
    expect(text).toContain(`"'=HYPERLINK(""http://evil"")";"Apto 101";"Chegou"`)
    expect(text).toContain(`"${noResident.code}";"";"";"Chegou"`)
    expect(text).toMatch(/";"";""$/m) // sem notificação nem retirada
  })
})
