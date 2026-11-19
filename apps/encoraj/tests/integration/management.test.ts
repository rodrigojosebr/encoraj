import { describe, expect, it } from 'vitest'
import { ObjectId } from 'mongodb'
import { GET as exportCsv } from '@/app/api/reports/management/export/route'
import { packages, residents, users } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { addDays, tzParts } from '@/lib/date/tz'
import { ERASED_ACTOR_NAME } from '@/lib/lgpd/erase'
import {
  DEFAULT_PERIOD_DAYS,
  getManagementReport,
  MAX_PERIOD_DAYS,
  NO_BLOCK_LABEL,
  NO_RESIDENT_LABEL,
  resolvePeriod,
} from '@/lib/reports/management'
import {
  createCondo,
  createPackage,
  createResident,
  createUser,
  jsonRequest,
  loginAs,
  type TestCondo,
  type TestUser,
} from '../helpers/factory'

// "Agora" fixo: quarta, 18/03/2026, 15h em São Paulo
const NOW = new Date('2026-03-18T18:00:00.000Z')
const MARCH = resolvePeriod({ from: '2026-03-01', to: '2026-03-31' }, NOW)

interface Movement {
  arrived: string
  by?: TestUser
  notified?: string
  delivered?: string
  deliveredBy?: TestUser
}

/** Cria uma encomenda com as datas e os autores indicados (horários em UTC) */
async function movement(condo: TestCondo, residentId: ObjectId, m: Movement) {
  const pkg = await createPackage(condo, residentId)
  const status = m.delivered ? 'delivered' : m.notified ? 'notified' : 'arrived'
  await (await packages()).updateOne(
    { _id: pkg._id },
    {
      $set: {
        arrived_at: new Date(m.arrived),
        status_id: (await getStatus(status))._id,
        ...(m.by ? { arrived_by: m.by._id } : {}),
        ...(m.notified ? { notified_at: new Date(m.notified) } : {}),
        ...(m.delivered ? { delivered_at: new Date(m.delivered) } : {}),
        ...(m.deliveredBy ? { delivered_by: m.deliveredBy._id } : {}),
      },
    },
  )
  return pkg
}

async function resident(condo: TestCondo, name: string, apartment: string, bloco?: string) {
  const r = await createResident(condo, name)
  await (await residents()).updateOne(
    { _id: r._id },
    bloco ? { $set: { apartment, bloco } } : { $set: { apartment }, $unset: { bloco: '' } },
  )
  return r
}

describe('resolvePeriod', () => {
  it('padrão: últimos 30 dias terminando hoje, no fuso de São Paulo', () => {
    // 01h UTC do dia 19 ainda é dia 18 em São Paulo
    const period = resolvePeriod({}, new Date('2026-03-19T01:00:00.000Z'))
    expect(period).toMatchObject({ fromStr: '2026-02-17', toStr: '2026-03-18', days: DEFAULT_PERIOD_DAYS })
    expect(period.from.toISOString()).toBe('2026-02-17T03:00:00.000Z')
    expect(period.to.toISOString()).toBe('2026-03-19T03:00:00.000Z')
  })

  it('usa as datas informadas; um dia só é um período válido', () => {
    expect(resolvePeriod({ from: '2026-03-01', to: '2026-03-31' }, NOW)).toMatchObject({ fromStr: '2026-03-01', toStr: '2026-03-31', days: 31 })
    expect(resolvePeriod({ from: '2026-03-10', to: '2026-03-10' }, NOW)).toMatchObject({ days: 1 })
    expect(resolvePeriod({ from: '2026-03-10' }, NOW)).toMatchObject({ fromStr: '2026-03-10', toStr: '2026-03-18' })
    expect(resolvePeriod({ to: '2026-01-30' }, NOW)).toMatchObject({ fromStr: '2026-01-01', toStr: '2026-01-30' })
  })

  it('corrige datas invertidas, malformadas e inexistentes', () => {
    expect(resolvePeriod({ from: '2026-03-31', to: '2026-03-01' }, NOW)).toMatchObject({ fromStr: '2026-03-01', toStr: '2026-03-31' })
    expect(resolvePeriod({ from: 'ontem', to: '31/03/2026' }, NOW)).toMatchObject({ toStr: '2026-03-18', days: DEFAULT_PERIOD_DAYS })
    expect(resolvePeriod({ from: '2026-02-30', to: '2026-03-05' }, NOW)).toMatchObject({ fromStr: '2026-03-02' })
  })

  it('limita o período ao máximo', () => {
    const period = resolvePeriod({ from: '2020-01-01', to: '2026-03-18' }, NOW)
    expect(period).toMatchObject({ toStr: '2026-03-18', days: MAX_PERIOD_DAYS })
    expect(period.fromStr).toBe(addDays('2026-03-18', -(MAX_PERIOD_DAYS - 1)))
  })
})

describe('tzParts / addDays', () => {
  it('data, dia da semana e hora no fuso do app', () => {
    expect(tzParts(new Date('2026-03-19T01:30:00.000Z'))).toEqual({ date: '2026-03-18', weekday: 3, hour: 22 })
    expect(tzParts(new Date('2026-03-22T03:00:00.000Z'))).toEqual({ date: '2026-03-22', weekday: 0, hour: 0 })
  })

  it('soma dias atravessando mês e ano', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01')
  })
})

describe('getManagementReport', () => {
  it('condomínio sem movimento: tudo zerado, sem erro', async () => {
    const condo = await createCondo()
    const report = await getManagementReport(condo._id.toString(), MARCH, NOW)

    expect(report.summary).toEqual({
      arrived: 0,
      delivered: 0,
      openNow: 0,
      avgPickupHours: null,
      medianPickupHours: null,
      within24hPct: null,
      avgNotifyMinutes: null,
      notifiedPct: null,
      deliveredWithoutNotice: 0,
    })
    expect(report.byDay).toHaveLength(31)
    expect(report.byDay.every((d) => d.arrived === 0 && d.delivered === 0)).toBe(true)
    expect(report.byWeekday).toEqual(Array(7).fill(0))
    expect(report.byHour).toEqual(Array(24).fill(0))
    expect(report).toMatchObject({ truncated: false, units: [], blocks: [], staff: [] })
    expect(report.stalled.rows).toEqual([])
    expect(report.stalled.buckets.map((b) => b.count)).toEqual([0, 0, 0, 0])
  })

  it('calcula volume, tempos, picos, unidades, blocos, equipe e paradas', async () => {
    const condo = await createCondo()
    const [porteiro, admin] = [await createUser(condo, 'porteiro', { name: 'Carlos' }), await createUser(condo, 'admin', { name: 'Ana Admin' })]
    const a101 = await resident(condo, 'Maria', '101', 'A')
    const a101b = await resident(condo, 'José', '101', 'A') // mesma unidade, outro morador
    const b202 = await resident(condo, 'Bia', '202', 'B')
    const casa = await resident(condo, 'Caio', '7')

    // Retiradas: 2h, 10h e 72h depois da chegada
    await movement(condo, a101._id, { arrived: '2026-03-02T13:00:00Z', by: porteiro, notified: '2026-03-02T13:10:00Z', delivered: '2026-03-02T15:00:00Z', deliveredBy: porteiro })
    await movement(condo, a101b._id, { arrived: '2026-03-02T13:30:00Z', by: porteiro, notified: '2026-03-02T14:00:00Z', delivered: '2026-03-02T23:30:00Z', deliveredBy: admin })
    await movement(condo, b202._id, { arrived: '2026-03-03T20:00:00Z', by: admin, delivered: '2026-03-06T20:00:00Z', deliveredBy: porteiro })
    // Em aberto: 1, 5, 10 e 20 dias paradas
    const d1 = await movement(condo, a101._id, { arrived: '2026-03-17T18:00:00Z', by: porteiro })
    await movement(condo, b202._id, { arrived: '2026-03-13T18:00:00Z', by: porteiro, notified: '2026-03-13T18:20:00Z' })
    await movement(condo, casa._id, { arrived: '2026-03-08T18:00:00Z', by: porteiro })
    const d20 = await movement(condo, casa._id, { arrived: '2026-02-26T18:00:00Z', by: porteiro }) // chegou antes do período
    // Fora do período e de outro condomínio: não entram
    await movement(condo, a101._id, { arrived: '2026-01-10T13:00:00Z', delivered: '2026-01-11T13:00:00Z' })
    const other = await createCondo()
    await movement(other, (await createResident(other))._id, { arrived: '2026-03-02T13:00:00Z' })

    const report = await getManagementReport(condo._id.toString(), MARCH, NOW)

    expect(report.summary).toEqual({
      arrived: 6,
      delivered: 3,
      openNow: 4,
      avgPickupHours: 28, // (2 + 10 + 72) / 3
      medianPickupHours: 10,
      within24hPct: 66.7,
      avgNotifyMinutes: 20, // (10 + 30 + 20) / 3
      notifiedPct: 50,
      deliveredWithoutNotice: 1,
    })

    const day = (date: string) => report.byDay.find((d) => d.date === date)
    expect(day('2026-03-02')).toEqual({ date: '2026-03-02', arrived: 2, delivered: 2 })
    expect(day('2026-03-03')).toEqual({ date: '2026-03-03', arrived: 1, delivered: 0 })
    expect(day('2026-03-06')).toEqual({ date: '2026-03-06', arrived: 0, delivered: 1 })
    expect(report.byDay.reduce((sum, d) => sum + d.arrived, 0)).toBe(6)

    // 02/03 é segunda; 13h e 13h30 UTC = 10h em São Paulo
    expect(report.byWeekday[1]).toBe(2)
    expect(report.byWeekday.reduce((a, b) => a + b, 0)).toBe(6)
    expect(report.byHour[10]).toBe(2)
    expect(report.byHour[15]).toBe(3) // 18h UTC
    expect(report.byHour[17]).toBe(1) // 20h UTC

    // Dois moradores do mesmo apto contam como uma unidade
    expect(report.units).toEqual([
      { label: 'Bloco A · Apto 101', block: 'A', received: 3, open: 1 },
      { label: 'Bloco B · Apto 202', block: 'B', received: 2, open: 1 },
      { label: 'Apto 7', block: NO_BLOCK_LABEL, received: 1, open: 2 },
    ])
    expect(report.blocks).toEqual([
      { block: 'A', received: 3 },
      { block: 'B', received: 2 },
      { block: NO_BLOCK_LABEL, received: 1 },
    ])

    expect(report.staff).toEqual([
      { name: 'Carlos', registered: 5, delivered: 2 },
      { name: 'Ana Admin', registered: 1, delivered: 1 },
    ])

    expect(report.stalled.buckets).toEqual([
      { label: 'até 2 dias', count: 1 },
      { label: '3 a 6 dias', count: 1 },
      { label: '7 a 14 dias', count: 1 },
      { label: '15 dias ou mais', count: 1 },
    ])
    expect(report.stalled.rows.map((r) => r.days)).toEqual([20, 10, 5, 1])
    expect(report.stalled.rows[0]).toMatchObject({ id: d20._id.toString(), code: d20.code, resident: 'Caio', unit: 'Apto 7' })
    expect(report.stalled.rows[3]).toMatchObject({ id: d1._id.toString(), resident: 'Maria', unit: 'Bloco A · Apto 101' })
  })

  it('mediana com quantidade par, e morador ou usuário já removidos', async () => {
    const condo = await createCondo()
    const ghostUser = { _id: new ObjectId() } as TestUser
    const gone = await createResident(condo, 'Vai Sair')
    await movement(condo, gone._id, { arrived: '2026-03-02T13:00:00Z', by: ghostUser, delivered: '2026-03-02T15:00:00Z' })
    await movement(condo, gone._id, { arrived: '2026-03-03T13:00:00Z', by: ghostUser, delivered: '2026-03-03T17:00:00Z', deliveredBy: ghostUser })
    await movement(condo, gone._id, { arrived: '2026-03-17T13:00:00Z', by: ghostUser })
    await (await residents()).deleteOne({ _id: gone._id })

    const report = await getManagementReport(condo._id.toString(), MARCH, NOW)

    expect(report.summary.medianPickupHours).toBe(3) // (2 + 4) / 2
    expect(report.units).toEqual([{ label: NO_RESIDENT_LABEL, block: NO_BLOCK_LABEL, received: 3, open: 1 }])
    expect(report.staff[0]).toEqual({ name: ERASED_ACTOR_NAME, registered: 3, delivered: 1 })
    expect(report.stalled.rows[0]).toMatchObject({ resident: NO_RESIDENT_LABEL, unit: NO_RESIDENT_LABEL })
    expect(await (await users()).countDocuments({ _id: ghostUser._id })).toBe(0)
  })

  it('morador de outro condomínio não tem o nome revelado, mesmo se a encomenda apontar para ele', async () => {
    const [mine, other] = [await createCondo(), await createCondo()]
    const foreign = await createResident(other, 'Nome Secreto')
    await movement(mine, foreign._id, { arrived: '2026-03-17T13:00:00Z' })

    const report = await getManagementReport(mine._id.toString(), MARCH, NOW)
    expect(JSON.stringify(report)).not.toContain('Nome Secreto')
    expect(report.stalled.rows[0].resident).toBe(NO_RESIDENT_LABEL)
  })
})

describe('GET /api/reports/management/export', () => {
  const download = (query: string) =>
    exportCsv(jsonRequest('GET', undefined, {}, `http://localhost/api/reports/management/export${query}`))
  const lines = async (res: Response) => (await res.text()).split('\n')

  async function scenario() {
    const condo = await createCondo()
    const porteiro = await createUser(condo, 'porteiro', { name: 'Carlos' })
    const maria = await resident(condo, 'Maria', '101', 'A')
    await movement(condo, maria._id, { arrived: '2026-03-02T13:00:00Z', by: porteiro, delivered: '2026-03-02T15:00:00Z', deliveredBy: porteiro })
    const open = await movement(condo, maria._id, { arrived: '2026-03-03T13:00:00Z', by: porteiro })
    await loginAs(await createUser(condo, 'sindico'))
    return { open }
  }
  const PERIOD = '&from=2026-03-01&to=2026-03-03'

  it('volume por dia', async () => {
    await scenario()
    const res = await download(`?section=daily${PERIOD}`)
    expect(res.headers.get('content-type')).toBe('text/csv; charset=utf-8')
    expect(res.headers.get('content-disposition')).toBe('attachment; filename="gerencial-daily-2026-03-01-a-2026-03-03.csv"')
    expect(await lines(res)).toEqual([
      '"Data";"Chegadas";"Retiradas"',
      '"01/03/2026";"0";"0"',
      '"02/03/2026";"1";"1"',
      '"03/03/2026";"1";"0"',
    ])
  })

  it('unidades, equipe e paradas', async () => {
    const { open } = await scenario()

    expect(await lines(await download(`?section=units${PERIOD}`))).toEqual([
      '"Unidade";"Bloco";"Recebidas no período";"Em aberto agora"',
      '"Bloco A · Apto 101";"A";"2";"1"',
    ])
    expect(await lines(await download(`?section=staff${PERIOD}`))).toEqual([
      '"Usuário";"Chegadas registradas";"Retiradas confirmadas"',
      '"Carlos";"2";"1"',
    ])
    const stalled = await lines(await download(`?section=stalled${PERIOD}`))
    expect(stalled[0]).toBe('"Código";"Morador";"Unidade";"Chegada";"Dias parada"')
    expect(stalled[1]).toMatch(new RegExp(`^"${open.code}";"Maria";"Bloco A · Apto 101";"03/03/2026, 10:00:00";"\\d+"$`))
    expect(stalled).toHaveLength(2)
  })

  it('seção ausente ou inválida → 400', async () => {
    await scenario()
    expect((await download('')).status).toBe(400)
    expect((await download('?section=tudo')).status).toBe(400)
    expect((await download('?section=constructor')).status).toBe(400)
  })

  it('exporta só o próprio condomínio', async () => {
    const other = await createCondo()
    const foreign = await resident(other, 'Morador Alheio', '999', 'Z')
    await movement(other, foreign._id, { arrived: '2026-03-02T13:00:00Z' })
    await scenario()

    for (const section of ['daily', 'units', 'staff', 'stalled']) {
      expect(await (await download(`?section=${section}${PERIOD}`)).text()).not.toMatch(/Alheio|999/)
    }
  })
})
