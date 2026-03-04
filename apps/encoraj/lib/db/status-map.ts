import type { ObjectId } from 'mongodb'
import { statuses, roles } from './collections'

// ── Cache (module-level, hot-reload safe via global) ────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __statusCache: Map<string, ObjectId> | undefined
  // eslint-disable-next-line no-var
  var __statusNameCache: Map<string, string> | undefined
  // eslint-disable-next-line no-var
  var __roleCache: Map<string, ObjectId> | undefined
  // eslint-disable-next-line no-var
  var __roleNameCache: Map<string, string> | undefined
}

function getStatusCache() {
  if (!global.__statusCache) global.__statusCache = new Map()
  return global.__statusCache
}

function getStatusNameCache() {
  if (!global.__statusNameCache) global.__statusNameCache = new Map()
  return global.__statusNameCache
}

function getRoleCache() {
  if (!global.__roleCache) global.__roleCache = new Map()
  return global.__roleCache
}

function getRoleNameCache() {
  if (!global.__roleNameCache) global.__roleNameCache = new Map()
  return global.__roleNameCache
}

// ── Status helpers ───────────────────────────────────────────────────────────

export async function getStatusId(name: string): Promise<ObjectId> {
  const cache = getStatusCache()
  if (cache.has(name)) return cache.get(name)!

  const col = await statuses()
  const doc = await col.findOne({ name })
  if (!doc?._id) throw new Error(`Status not found: ${name}`)

  cache.set(name, doc._id)
  return doc._id
}

export async function getStatusName(id: ObjectId): Promise<string> {
  const key = id.toString()
  const cache = getStatusNameCache()
  if (cache.has(key)) return cache.get(key)!

  const col = await statuses()
  const doc = await col.findOne({ _id: id })
  if (!doc) throw new Error(`Status not found for id: ${key}`)

  cache.set(key, doc.name)
  return doc.name
}

// ── Role helpers ─────────────────────────────────────────────────────────────

export async function getRoleId(name: string): Promise<ObjectId> {
  const cache = getRoleCache()
  if (cache.has(name)) return cache.get(name)!

  const col = await roles()
  const doc = await col.findOne({ name })
  if (!doc?._id) throw new Error(`Role not found: ${name}`)

  cache.set(name, doc._id)
  return doc._id
}

export async function getRoleName(id: ObjectId): Promise<string> {
  const key = id.toString()
  const cache = getRoleNameCache()
  if (cache.has(key)) return cache.get(key)!

  const col = await roles()
  const doc = await col.findOne({ _id: id })
  if (!doc) throw new Error(`Role not found for id: ${key}`)

  cache.set(key, doc.name)
  return doc.name
}
