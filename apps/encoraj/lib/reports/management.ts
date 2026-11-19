import { ObjectId } from 'mongodb'
import { packages, residents, users } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { addDays, parseDateAsTZ, tzParts } from '@/lib/date/tz'
import { ERASED_ACTOR_NAME } from '@/lib/lgpd/erase'

/**
 * Relatório gerencial: números para o síndico e o administrador decidirem —
 * volume, tempo de retirada, horários de pico, unidades, equipe e encomendas paradas.
 * Tudo calculado a partir das encomendas do próprio condomínio.
 */

export const DEFAULT_PERIOD_DAYS = 30
export const MAX_PERIOD_DAYS = 366
/** Teto de encomendas lidas por consulta — protege memória e tempo da função */
export const MAX_DOCS = 50_000
export const TOP_N = 10

const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000
const DATE = /^\d{4}-\d{2}-\d{2}$/
export const NO_RESIDENT_LABEL = 'Morador removido'
export const NO_BLOCK_LABEL = 'Sem bloco'

export interface Period {
  /** 'YYYY-MM-DD', inclusive, no fuso do app */
  fromStr: string
  toStr: string
  /** Instantes UTC: [from, to) */
  from: Date
  to: Date
  days: number
}

/** Período do relatório a partir de `?from=&to=`. Padrão: últimos 30 dias, terminando hoje. */
export function resolvePeriod(params: { from?: string; to?: string }, now = new Date()): Period {
  const valid = (value?: string) => (value && DATE.test(value) ? addDays(value, 0) : undefined)

  let toStr = valid(params.to) ?? tzParts(now).date
  let fromStr = valid(params.from) ?? addDays(toStr, -(DEFAULT_PERIOD_DAYS - 1))
  if (fromStr > toStr) [fromStr, toStr] = [toStr, fromStr]

  const from = parseDateAsTZ(fromStr)
  const to = new Date(parseDateAsTZ(toStr).getTime() + DAY_MS)
  const days = Math.round((to.getTime() - from.getTime()) / DAY_MS)
  if (days > MAX_PERIOD_DAYS) {
    return resolvePeriod({ from: addDays(toStr, -(MAX_PERIOD_DAYS - 1)), to: toStr }, now)
  }

  return { fromStr, toStr, from, to, days }
}

export interface UnitRow {
  label: string
  block: string
  received: number
  open: number
}

export interface StaffRow {
  name: string
  registered: number
  delivered: number
}

export interface StalledRow {
  id: string
  code: string
  resident: string
  unit: string
  arrivedAt: Date
  days: number
}

export interface ManagementReport {
  period: Period
  /** true quando alguma consulta bateu no teto de MAX_DOCS — os números são parciais */
  truncated: boolean
  summary: {
    arrived: number
    delivered: number
    openNow: number
    /** Horas entre chegada e retirada, das encomendas retiradas no período */
    avgPickupHours: number | null
    medianPickupHours: number | null
    within24hPct: number | null
    /** Minutos entre chegada e aviso, das que chegaram no período e foram avisadas */
    avgNotifyMinutes: number | null
    notifiedPct: number | null
    deliveredWithoutNotice: number
  }
  byDay: Array<{ date: string; arrived: number; delivered: number }>
  /** Chegadas por dia da semana, 0 = domingo */
  byWeekday: number[]
  /** Chegadas por hora do dia, 0–23 */
  byHour: number[]
  units: UnitRow[]
  blocks: Array<{ block: string; received: number }>
  staff: StaffRow[]
  stalled: {
    buckets: Array<{ label: string; count: number }>
    rows: StalledRow[]
  }
}

const STALLED_BUCKETS = [
  { label: 'até 2 dias', min: 0 },
  { label: '3 a 6 dias', min: 3 },
  { label: '7 a 14 dias', min: 7 },
  { label: '15 dias ou mais', min: 15 },
]

const round1 = (value: number) => Math.round(value * 10) / 10
const average = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null)
const percent = (part: number, total: number) => (total ? round1((part / total) * 100) : null)

function median(values: number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export async function getManagementReport(
  condoId: string,
  period: Period,
  now = new Date(),
): Promise<ManagementReport> {
  const condoOid = new ObjectId(condoId)
  const pkgCol = await packages()
  const [arrivedStatus, notifiedStatus] = await Promise.all([getStatus('arrived'), getStatus('notified')])
  const inPeriod = { $gte: period.from, $lt: period.to }

  const [arrivedDocs, deliveredDocs, openDocs] = await Promise.all([
    pkgCol
      .find(
        { condo_id: condoOid, arrived_at: inPeriod },
        { projection: { resident_id: 1, arrived_at: 1, notified_at: 1, arrived_by: 1 } },
      )
      .limit(MAX_DOCS)
      .toArray(),
    pkgCol
      .find(
        { condo_id: condoOid, delivered_at: inPeriod },
        { projection: { arrived_at: 1, delivered_at: 1, delivered_by: 1, notified_at: 1 } },
      )
      .limit(MAX_DOCS)
      .toArray(),
    pkgCol
      .find(
        { condo_id: condoOid, status_id: { $in: [arrivedStatus._id, notifiedStatus._id] } },
        { projection: { code: 1, resident_id: 1, arrived_at: 1 } },
      )
      .sort({ arrived_at: 1 })
      .limit(MAX_DOCS)
      .toArray(),
  ])

  // ── Volume por dia, dia da semana e hora ──────────────────────────────────
  const dayIndex = new Map<string, { date: string; arrived: number; delivered: number }>()
  for (let i = 0; i < period.days; i++) {
    const date = addDays(period.fromStr, i)
    dayIndex.set(date, { date, arrived: 0, delivered: 0 })
  }
  const byWeekday = Array<number>(7).fill(0)
  const byHour = Array<number>(24).fill(0)

  for (const pkg of arrivedDocs) {
    const parts = tzParts(pkg.arrived_at)
    const day = dayIndex.get(parts.date)
    if (day) day.arrived++
    byWeekday[parts.weekday]++
    byHour[parts.hour]++
  }
  for (const pkg of deliveredDocs) {
    const day = dayIndex.get(tzParts(pkg.delivered_at!).date)
    if (day) day.delivered++
  }

  // ── Tempos ────────────────────────────────────────────────────────────────
  const pickupHours = deliveredDocs.map((p) => Math.max(0, p.delivered_at!.getTime() - p.arrived_at.getTime()) / HOUR_MS)
  const notified = arrivedDocs.filter((p) => p.notified_at)
  const notifyMinutes = notified.map((p) => Math.max(0, p.notified_at!.getTime() - p.arrived_at.getTime()) / 60_000)
  const avgPickup = average(pickupHours)
  const medianPickup = median(pickupHours)
  const avgNotify = average(notifyMinutes)

  // ── Moradores e unidades ──────────────────────────────────────────────────
  const residentIds = new Map<string, ObjectId>()
  for (const pkg of [...arrivedDocs, ...openDocs]) residentIds.set(pkg.resident_id.toString(), pkg.resident_id)
  const residentDocs = residentIds.size
    ? await (await residents())
        .find(
          { _id: { $in: [...residentIds.values()] }, condo_id: condoOid },
          { projection: { name: 1, apartment: 1, bloco: 1 } },
        )
        .toArray()
    : []
  const residentById = new Map(residentDocs.map((r) => [r._id.toString(), r]))

  const unitOf = (residentId: ObjectId) => {
    const resident = residentById.get(residentId.toString())
    if (!resident) return { key: '', label: NO_RESIDENT_LABEL, block: NO_BLOCK_LABEL, name: NO_RESIDENT_LABEL }
    const block = resident.bloco?.trim() || NO_BLOCK_LABEL
    return {
      key: `${block}|${resident.apartment}`,
      label: resident.bloco?.trim() ? `Bloco ${block} · Apto ${resident.apartment}` : `Apto ${resident.apartment}`,
      block,
      name: resident.name,
    }
  }

  const unitIndex = new Map<string, UnitRow>()
  const unitRow = (residentId: ObjectId) => {
    const { key, label, block } = unitOf(residentId)
    let row = unitIndex.get(key)
    if (!row) unitIndex.set(key, (row = { label, block, received: 0, open: 0 }))
    return row
  }
  for (const pkg of arrivedDocs) unitRow(pkg.resident_id).received++
  for (const pkg of openDocs) unitRow(pkg.resident_id).open++

  const units = [...unitIndex.values()].sort(
    (a, b) => b.received - a.received || b.open - a.open || a.label.localeCompare(b.label, 'pt-BR', { numeric: true }),
  )

  const blockIndex = new Map<string, number>()
  for (const unit of units) blockIndex.set(unit.block, (blockIndex.get(unit.block) ?? 0) + unit.received)
  const blocks = [...blockIndex.entries()]
    .map(([block, received]) => ({ block, received }))
    .filter((b) => b.received > 0)
    .sort((a, b) => b.received - a.received || a.block.localeCompare(b.block, 'pt-BR', { numeric: true }))

  // ── Equipe ────────────────────────────────────────────────────────────────
  const staffIndex = new Map<string, { id: ObjectId; registered: number; delivered: number }>()
  const staffRow = (id: ObjectId) => {
    let row = staffIndex.get(id.toString())
    if (!row) staffIndex.set(id.toString(), (row = { id, registered: 0, delivered: 0 }))
    return row
  }
  for (const pkg of arrivedDocs) staffRow(pkg.arrived_by).registered++
  for (const pkg of deliveredDocs) if (pkg.delivered_by) staffRow(pkg.delivered_by).delivered++

  const staffDocs = staffIndex.size
    ? await (await users())
        .find({ _id: { $in: [...staffIndex.values()].map((s) => s.id) }, condo_id: condoOid }, { projection: { name: 1 } })
        .toArray()
    : []
  const staffNames = new Map(staffDocs.map((u) => [u._id.toString(), u.name]))
  const staff = [...staffIndex.entries()]
    .map(([id, row]) => ({ name: staffNames.get(id) ?? ERASED_ACTOR_NAME, registered: row.registered, delivered: row.delivered }))
    .sort((a, b) => b.registered + b.delivered - (a.registered + a.delivered) || a.name.localeCompare(b.name, 'pt-BR'))

  // ── Encomendas paradas (em aberto agora, da mais antiga para a mais nova) ──
  const buckets = STALLED_BUCKETS.map(({ label }) => ({ label, count: 0 }))
  const stalledRows: StalledRow[] = openDocs.map((pkg) => {
    const days = Math.max(0, Math.floor((now.getTime() - pkg.arrived_at.getTime()) / DAY_MS))
    let bucket = 0
    STALLED_BUCKETS.forEach((b, i) => {
      if (days >= b.min) bucket = i
    })
    buckets[bucket].count++
    const unit = unitOf(pkg.resident_id)
    return { id: pkg._id.toString(), code: pkg.code, resident: unit.name, unit: unit.label, arrivedAt: pkg.arrived_at, days }
  })

  return {
    period,
    truncated: [arrivedDocs, deliveredDocs, openDocs].some((docs) => docs.length >= MAX_DOCS),
    summary: {
      arrived: arrivedDocs.length,
      delivered: deliveredDocs.length,
      openNow: openDocs.length,
      avgPickupHours: avgPickup === null ? null : round1(avgPickup),
      medianPickupHours: medianPickup === null ? null : round1(medianPickup),
      within24hPct: percent(pickupHours.filter((h) => h <= 24).length, pickupHours.length),
      avgNotifyMinutes: avgNotify === null ? null : Math.round(avgNotify),
      notifiedPct: percent(notified.length, arrivedDocs.length),
      deliveredWithoutNotice: deliveredDocs.filter((p) => !p.notified_at).length,
    },
    byDay: [...dayIndex.values()],
    byWeekday,
    byHour,
    units,
    blocks,
    staff,
    stalled: { buckets, rows: stalledRows },
  }
}
