import type { ObjectId } from 'mongodb'
import { statuses, roles } from './collections'

// ── Return types ─────────────────────────────────────────────────────────────

export interface StatusInfo {
  _id: ObjectId
  name: string
  label: string
}

export interface RoleInfo {
  _id: ObjectId
  name: string
  label: string
}

// ── Cache (module-level, hot-reload safe via global) ─────────────────────────

declare global {
  var __statusByName: Map<string, StatusInfo> | undefined
  var __statusById: Map<string, StatusInfo> | undefined
  var __roleByName: Map<string, RoleInfo> | undefined
  var __roleById: Map<string, RoleInfo> | undefined
}

function statusByName(): Map<string, StatusInfo> {
  return (global.__statusByName ??= new Map())
}
function statusById(): Map<string, StatusInfo> {
  return (global.__statusById ??= new Map())
}
function roleByName(): Map<string, RoleInfo> {
  return (global.__roleByName ??= new Map())
}
function roleById(): Map<string, RoleInfo> {
  return (global.__roleById ??= new Map())
}

// ── Prime both caches on first fetch ─────────────────────────────────────────

function primeStatus(info: StatusInfo): StatusInfo {
  statusByName().set(info.name, info)
  statusById().set(info._id.toString(), info)
  return info
}

function primeRole(info: RoleInfo): RoleInfo {
  roleByName().set(info.name, info)
  roleById().set(info._id.toString(), info)
  return info
}

// ── Status ───────────────────────────────────────────────────────────────────

export async function getStatus(name: string): Promise<StatusInfo> {
  const cached = statusByName().get(name)
  if (cached) return cached

  const col = await statuses()
  const doc = await col.findOne({ name })
  if (!doc?._id) throw new Error(`Status not found: ${name}`)

  return primeStatus({ _id: doc._id, name: doc.name, label: doc.label })
}

export async function getStatusById(id: ObjectId): Promise<StatusInfo> {
  const key = id.toString()
  const cached = statusById().get(key)
  if (cached) return cached

  const col = await statuses()
  const doc = await col.findOne({ _id: id })
  if (!doc?._id) throw new Error(`Status not found for id: ${key}`)

  return primeStatus({ _id: doc._id, name: doc.name, label: doc.label })
}

// ── Role ─────────────────────────────────────────────────────────────────────

export async function getRole(name: string): Promise<RoleInfo> {
  const cached = roleByName().get(name)
  if (cached) return cached

  const col = await roles()
  const doc = await col.findOne({ name })
  if (!doc?._id) throw new Error(`Role not found: ${name}`)

  return primeRole({ _id: doc._id, name: doc.name, label: doc.label })
}

export async function getRoleById(id: ObjectId): Promise<RoleInfo> {
  const key = id.toString()
  const cached = roleById().get(key)
  if (cached) return cached

  const col = await roles()
  const doc = await col.findOne({ _id: id })
  if (!doc?._id) throw new Error(`Role not found for id: ${key}`)

  return primeRole({ _id: doc._id, name: doc.name, label: doc.label })
}

