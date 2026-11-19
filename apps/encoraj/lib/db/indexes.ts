import type { Db } from 'mongodb'
import { reportError } from '@/lib/observability/report'
import { ORG_ADMIN_ROLE, SUPER_ADMIN_ROLE } from '@/lib/auth/roles'

const DAY = 24 * 60 * 60 // em segundos

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
    void reportError('[indexes]', err)
  }))
}

async function run(db: Db): Promise<void> {
  const jobs: Array<Promise<unknown>> = [
    db.collection('packages').createIndex({ condo_id: 1, arrived_at: -1 }),
    db.collection('packages').createIndex({ condo_id: 1, status_id: 1 }),
    db.collection('packages').createIndex({ public_token: 1 }, { unique: true, sparse: true }),
    db.collection('residents').createIndex({ condo_id: 1, status_id: 1, name: 1 }),
    db.collection('users').createIndex({ condo_id: 1 }),
    db.collection('condominiums').createIndex({ org_id: 1 }, { sparse: true }),
    db.collection('audit_logs').createIndex({ condo_id: 1, timestamp: -1 }),
    db.collection('rate_limits').createIndex({ key: 1 }, { unique: true }),
    db.collection('rate_limits').createIndex({ reset_at: 1 }, { expireAfterSeconds: 0 }),
    db.collection('password_reset_tokens').createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 }),
    // Dados de plataforma: somem sozinhos depois de um tempo (não são dado de morador)
    db.collection('error_logs').createIndex({ fingerprint: 1 }, { unique: true }),
    db.collection('error_logs').createIndex({ last_at: -1 }, { expireAfterSeconds: 90 * DAY }),
    db.collection('ai_usage').createIndex({ created_at: -1 }, { expireAfterSeconds: 400 * DAY }),
  ]

  // Email único entre usuários ativos (soft-delete libera o endereço)
  const active = await db.collection('statuses').findOne({ name: 'active' })
  if (active) {
    // As roles que nenhuma tela de usuários atribui precisam existir: `superadmin` é dada
    // direto no banco; `administradora` nasce com a administradora. Criar o documento da
    // role não dá acesso a ninguém.
    for (const [name, label] of [[SUPER_ADMIN_ROLE, 'Super admin'], [ORG_ADMIN_ROLE, 'Administradora']]) {
      jobs.push(
        db.collection('roles').updateOne(
          { name },
          { $setOnInsert: { name, label, status_id: active._id, created_at: new Date() } },
          { upsert: true },
        ),
      )
    }
    jobs.push(
      db.collection('users').createIndex(
        { email: 1 },
        { name: 'email_active_unique', unique: true, partialFilterExpression: { status_id: active._id } },
      ),
    )
  }

  const results = await Promise.allSettled(jobs)
  for (const r of results) {
    if (r.status === 'rejected') void reportError('[indexes]', r.reason)
  }
}
