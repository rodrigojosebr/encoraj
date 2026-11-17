import { ObjectId, type Filter } from 'mongodb'
import { residents, type PackageDoc } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { escapeRegex } from '@/lib/db/escape-regex'
import { getTodayRange, parseDateAsTZ } from '@/lib/date/tz'

export interface PackageListParams {
  /** 'open' (chegou + notificado), 'arrived', 'notified' ou 'delivered' */
  status?: string
  /** 'today' */
  period?: string
  /** YYYY-MM-DD, pela data de chegada */
  from?: string
  to?: string
  q?: string
}

/** Teto de linhas do export CSV — protege memória e tempo da função */
export const EXPORT_MAX_ROWS = 10_000

const PACKAGE_STATUSES = ['arrived', 'notified', 'delivered']
const DATE = /^\d{4}-\d{2}-\d{2}$/
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Filtro do MongoDB para listagens de encomendas (/packages, /reports e export CSV).
 * Sempre restrito ao condomínio; parâmetro desconhecido ou malformado é ignorado.
 *
 * @param searchCode `q` também procura pelo código da encomenda (além do nome do morador)
 */
export async function buildPackageFilter(
  condoId: string,
  params: PackageListParams,
  { searchCode }: { searchCode: boolean },
): Promise<Filter<PackageDoc>> {
  const condoOid = new ObjectId(condoId)
  const filter: Filter<PackageDoc> = { condo_id: condoOid }
  const { status, period, from, to } = params
  const q = params.q?.trim()

  if (status === 'open') {
    const [arrived, notified] = await Promise.all([getStatus('arrived'), getStatus('notified')])
    filter.status_id = { $in: [arrived._id, notified._id] }
  } else if (status && PACKAGE_STATUSES.includes(status)) {
    filter.status_id = (await getStatus(status))._id
  }

  if (period === 'today') {
    const { today, tomorrow } = getTodayRange()
    const range = { $gte: today, $lt: tomorrow }
    if (status === 'delivered') filter.delivered_at = range
    else filter.arrived_at = range
  }

  const validFrom = from && DATE.test(from) ? from : undefined
  const validTo = to && DATE.test(to) ? to : undefined
  if (validFrom || validTo) {
    filter.arrived_at = {
      ...(validFrom ? { $gte: parseDateAsTZ(validFrom) } : {}),
      ...(validTo ? { $lt: new Date(parseDateAsTZ(validTo).getTime() + DAY_MS) } : {}),
    }
  }

  if (q) {
    const regex = { $regex: escapeRegex(q), $options: 'i' }
    const matched = await (await residents())
      .find({ condo_id: condoOid, name: regex }, { projection: { _id: 1 } })
      .toArray()
    const residentIds = matched.map((r) => r._id)

    if (searchCode) {
      filter.$or = [
        { code: regex },
        ...(residentIds.length > 0 ? [{ resident_id: { $in: residentIds } }] : []),
      ]
    } else {
      filter.resident_id = { $in: residentIds }
    }
  }

  return filter
}
