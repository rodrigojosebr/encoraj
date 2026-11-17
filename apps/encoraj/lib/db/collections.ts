import type { Collection, ObjectId } from 'mongodb'
import { getDb } from './client'

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface StatusDoc {
  _id?: ObjectId
  name: string
  label: string
  created_at: Date
}

export interface RoleDoc {
  _id?: ObjectId
  name: string
  label: string
  status_id: ObjectId
  created_at: Date
}

export interface CondominiumDoc {
  _id?: ObjectId
  name: string
  slug: string
  photo_url?: string
  status_id: ObjectId
  created_at: Date
}

export interface UserDoc {
  _id?: ObjectId
  condo_id: ObjectId
  name: string
  email: string
  password_hash: string
  role_id: ObjectId
  status_id: ObjectId
  photo_url?: string
  password_changed_at?: Date
  /** Aceite dos Termos e da Política no cadastro do condomínio (só o admin que se cadastrou) */
  terms_accepted_at?: Date
  terms_version?: string
  created_at: Date
  deleted_at?: Date
  deleted_by?: ObjectId
}

export interface ResidentDoc {
  _id?: ObjectId
  condo_id: ObjectId
  name: string
  apartment: string
  bloco?: string
  whatsapp: string
  status_id: ObjectId
  created_at: Date
  created_by: ObjectId
  deleted_at?: Date
  deleted_by?: ObjectId
}

export interface PasswordResetTokenDoc {
  _id?: ObjectId
  user_id: ObjectId
  token_hash: string
  expires_at: Date
  used_at?: Date
}

export interface AuditLogDoc {
  _id?: ObjectId
  condo_id: ObjectId
  entity: 'residents' | 'users' | 'packages' | 'condominiums'
  entity_id: ObjectId
  action: 'created' | 'updated' | 'deleted'
  actor_id: ObjectId
  actor_name: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  timestamp: Date
}

export interface PackageDoc {
  _id?: ObjectId
  condo_id: ObjectId
  resident_id: ObjectId
  code: string
  delivery_pin?: string
  /** Token aleatório do link público /p/{token}. Pacotes antigos não têm. */
  public_token?: string
  qrcode_url: string
  photo_url: string
  status_id: ObjectId
  arrived_at: Date
  arrived_by: ObjectId
  notified_at?: Date
  delivered_at?: Date
  delivered_by?: ObjectId
  notes?: string
  created_at: Date
}

// ── Collection helpers ───────────────────────────────────────────────────────

export async function statuses(): Promise<Collection<StatusDoc>> {
  const db = await getDb()
  return db.collection<StatusDoc>('statuses')
}

export async function roles(): Promise<Collection<RoleDoc>> {
  const db = await getDb()
  return db.collection<RoleDoc>('roles')
}

export async function condominiums(): Promise<Collection<CondominiumDoc>> {
  const db = await getDb()
  return db.collection<CondominiumDoc>('condominiums')
}

export async function users(): Promise<Collection<UserDoc>> {
  const db = await getDb()
  return db.collection<UserDoc>('users')
}

export async function residents(): Promise<Collection<ResidentDoc>> {
  const db = await getDb()
  return db.collection<ResidentDoc>('residents')
}

export async function packages(): Promise<Collection<PackageDoc>> {
  const db = await getDb()
  return db.collection<PackageDoc>('packages')
}

export async function auditLogs(): Promise<Collection<AuditLogDoc>> {
  const db = await getDb()
  return db.collection<AuditLogDoc>('audit_logs')
}

export interface RateLimitDoc {
  _id?: ObjectId
  key: string
  attempts: number
  reset_at: Date
}

export async function passwordResetTokens(): Promise<Collection<PasswordResetTokenDoc>> {
  const db = await getDb()
  return db.collection<PasswordResetTokenDoc>('password_reset_tokens')
}

export async function rateLimits(): Promise<Collection<RateLimitDoc>> {
  const db = await getDb()
  return db.collection<RateLimitDoc>('rate_limits')
}
