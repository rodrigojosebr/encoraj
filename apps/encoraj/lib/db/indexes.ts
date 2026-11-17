import type { Db } from 'mongodb'

declare global {
  var __indexesEnsured: Promise<void> | undefined
}

/**
 * Cria os índices uma vez por processo. `createIndex` é no-op quando o índice já existe.
 * Falha aqui não pode derrubar o request — só registra (ex.: índice único de email
 * recusado porque já existem emails duplicados no banco).
 */
export function ensureIndexes(db: Db): Promise<void> {
  return (globalThis.__indexesEnsured ??= run(db).catch((err) => {
    console.error('[indexes]', err)
  }))
}

async function run(db: Db): Promise<void> {
  const jobs: Array<Promise<unknown>> = [
    db.collection('packages').createIndex({ condo_id: 1, arrived_at: -1 }),
    db.collection('packages').createIndex({ condo_id: 1, status_id: 1 }),
    db.collection('packages').createIndex({ public_token: 1 }, { unique: true, sparse: true }),
    db.collection('residents').createIndex({ condo_id: 1, status_id: 1, name: 1 }),
    db.collection('users').createIndex({ condo_id: 1 }),
    db.collection('audit_logs').createIndex({ condo_id: 1, timestamp: -1 }),
    db.collection('rate_limits').createIndex({ key: 1 }, { unique: true }),
    db.collection('rate_limits').createIndex({ reset_at: 1 }, { expireAfterSeconds: 0 }),
    db.collection('password_reset_tokens').createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 }),
  ]

  // Email único entre usuários ativos (soft-delete libera o endereço)
  const active = await db.collection('statuses').findOne({ name: 'active' })
  if (active) {
    jobs.push(
      db.collection('users').createIndex(
        { email: 1 },
        { name: 'email_active_unique', unique: true, partialFilterExpression: { status_id: active._id } },
      ),
    )
  }

  const results = await Promise.allSettled(jobs)
  for (const r of results) {
    if (r.status === 'rejected') console.error('[indexes]', r.reason)
  }
}
