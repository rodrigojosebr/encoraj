import { ObjectId } from 'mongodb'
import { auditLogs, type AuditLogDoc } from '@/lib/db/collections'

interface LogActionParams {
  condo_id: ObjectId
  entity: AuditLogDoc['entity']
  entity_id: ObjectId
  action: AuditLogDoc['action']
  actor_id: ObjectId
  actor_name: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
}

export async function logAction(params: LogActionParams): Promise<void> {
  const col = await auditLogs()
  await col.insertOne({
    condo_id: params.condo_id,
    entity: params.entity,
    entity_id: params.entity_id,
    action: params.action,
    actor_id: params.actor_id,
    actor_name: params.actor_name,
    before: params.before,
    after: params.after,
    timestamp: new Date(),
  })
}
