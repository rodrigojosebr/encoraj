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

/** Administradora: empresa que cuida de vários condomínios */
export interface OrganizationDoc {
  _id?: ObjectId
  name: string
  status_id: ObjectId
  created_at: Date
}

export interface CondominiumDoc {
  _id?: ObjectId
  /** Administradora a que pertence. Ausente = condomínio autogerido */
  org_id?: ObjectId
  name: string
  slug: string
  photo_url?: string
  status_id: ObjectId
  created_at: Date
}

export interface UserDoc {
  _id?: ObjectId
  /** Condomínio do usuário. Para o admin da administradora, é onde ele cai ao fazer login */
  condo_id: ObjectId
  /** Só no admin da administradora (role `administradora`): de qual ela é */
  org_id?: ObjectId
  name: string
  email: string
  password_hash: string
  /** Roles do usuário — as permissões se somam */
  role_ids: ObjectId[]
  status_id: ObjectId
  photo_url?: string
  password_changed_at?: Date
  /** A senha atual foi definida por outra pessoa: o dono precisa trocá-la antes de usar o sistema */
  must_change_password?: boolean
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
  /** 6 dígitos exigidos na retirada. Só fica ausente depois da remoção definitiva do morador */
  delivery_pin?: string
  /** Token aleatório do link público /p/{token}. Idem: ausente só após remoção definitiva */
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

export async function organizations(): Promise<Collection<OrganizationDoc>> {
  const db = await getDb()
  return db.collection<OrganizationDoc>('organizations')
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

// ── Plataforma (super admin) — não pertencem a um condomínio ──────────────────

/** Erro de servidor agrupado: o mesmo erro vira um documento só, com contador. */
export interface ErrorLogDoc {
  _id?: ObjectId
  /** Hash de origem + tipo + mensagem mascarada */
  fingerprint: string
  label: string
  name: string
  /** Sempre mascarada (sem email, telefone, token ou link assinado) */
  message: string
  stack?: string
  extra?: Record<string, string>
  env: string
  count: number
  first_at: Date
  last_at: Date
  resolved_at?: Date
  resolved_by?: ObjectId
}

export type AiOutcome = 'matched' | 'no_match' | 'invalid_response' | 'error' | 'disabled'

/** Uma chamada ao modelo de IA (hoje: leitura de etiqueta). Sem texto nem imagem. */
export interface AiUsageDoc {
  _id?: ObjectId
  condo_id: ObjectId
  user_id: ObjectId
  feature: 'ocr'
  model: string
  outcome: AiOutcome
  confidence?: 'high' | 'medium' | 'low'
  prompt_tokens: number
  output_tokens: number
  total_tokens: number
  latency_ms: number
  image_bytes: number
  created_at: Date
}

export async function errorLogs(): Promise<Collection<ErrorLogDoc>> {
  const db = await getDb()
  return db.collection<ErrorLogDoc>('error_logs')
}

export async function aiUsage(): Promise<Collection<AiUsageDoc>> {
  const db = await getDb()
  return db.collection<AiUsageDoc>('ai_usage')
}
