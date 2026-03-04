import type { Collection, ObjectId } from 'mongodb'
import { getDb } from './client'

// ── Tipos ──────────────────────────────────────────────────────────────────

export type Role = 'admin' | 'porteiro' | 'sindico'
export type PackageStatus = 'arrived' | 'notified' | 'delivered'

export interface UserDoc {
  _id?: ObjectId
  name: string
  email: string
  password_hash: string
  role: Role
  active: boolean
  created_at: Date
}

export interface ResidentDoc {
  _id?: ObjectId
  name: string
  apartment: string
  whatsapp: string
  active: boolean
  created_at: Date
}

export interface PackageDoc {
  _id?: ObjectId
  resident_id: ObjectId
  code: string
  qrcode_url: string
  photo_url: string
  status: PackageStatus
  arrived_at: Date
  arrived_by: ObjectId
  notified_at?: Date
  delivered_at?: Date
  delivered_by?: ObjectId
  notes?: string
  created_at: Date
}

// ── Helpers ────────────────────────────────────────────────────────────────

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
