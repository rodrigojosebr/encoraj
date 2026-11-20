import { ObjectId } from 'mongodb'
import { packages } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { getTodayRange } from '@/lib/date/tz'

export interface PackageStats {
  arrivedToday: number
  /** Chegou ou notificado: ainda não retirado */
  open: number
  deliveredToday: number
  total: number
}

/** Números dos cartões do início e de /reports. "Hoje" é o dia de São Paulo. */
export async function getPackageStats(condoId: string): Promise<PackageStats> {
  const col = await packages()
  const condoOid = new ObjectId(condoId)
  const { today, tomorrow } = getTodayRange()
  const todayRange = { $gte: today, $lt: tomorrow }
  const [arrived, notified, delivered] = await Promise.all([
    getStatus('arrived'),
    getStatus('notified'),
    getStatus('delivered'),
  ])

  const [arrivedToday, open, deliveredToday, total] = await Promise.all([
    col.countDocuments({ condo_id: condoOid, arrived_at: todayRange }),
    col.countDocuments({ condo_id: condoOid, status_id: { $in: [arrived._id, notified._id] } }),
    col.countDocuments({ condo_id: condoOid, status_id: delivered._id, delivered_at: todayRange }),
    col.countDocuments({ condo_id: condoOid }),
  ])
  return { arrivedToday, open, deliveredToday, total }
}
