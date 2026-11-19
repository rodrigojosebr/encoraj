import bcrypt from 'bcryptjs'
import { ObjectId } from 'mongodb'
import { NextRequest } from 'next/server'
import { condominiums, organizations, packages, residents, users } from '@/lib/db/collections'
import { getRole, getStatus } from '@/lib/db/status-map'
import { signToken } from '@/lib/auth/jwt'
import { AUTH_COOKIE } from '@/lib/auth/cookies'
import { requestState } from './request-state'

export const PASSWORD = 'senha-forte-123'
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 4) // custo baixo: teste não precisa de hash lento

/** Roles de condomínio — as que a tabela de acesso das rotas percorre */
export type CondoRole = 'admin' | 'zelador' | 'porteiro' | 'sindico'
export type RoleName = CondoRole | 'superadmin' | 'administradora'
export const ALL_ROLES: CondoRole[] = ['admin', 'zelador', 'porteiro', 'sindico']

export interface TestCondo {
  _id: ObjectId
  name: string
}

export interface TestUser {
  _id: ObjectId
  name: string
  email: string
  roles: RoleName[]
  condo: TestCondo
}

let seq = 0

export interface TestOrg {
  _id: ObjectId
  name: string
}

/** Administradora. Sem ela, o condomínio é autogerido. */
export async function createOrg(name = `Administradora ${++seq}`): Promise<TestOrg> {
  const { insertedId } = await (await organizations()).insertOne({
    name,
    status_id: (await getStatus('active'))._id,
    created_at: new Date(),
  })
  return { _id: insertedId, name }
}

export async function createCondo(name?: string, org?: TestOrg): Promise<TestCondo> {
  const n = ++seq
  const condoName = name ?? `Condomínio ${n}`
  const { insertedId } = await (await condominiums()).insertOne({
    ...(org ? { org_id: org._id } : {}),
    name: condoName,
    slug: `condo-${n}-${new ObjectId().toString()}`,
    status_id: (await getStatus('active'))._id,
    created_at: new Date(),
  })
  return { _id: insertedId, name: condoName }
}

export async function createUser(
  condo: TestCondo,
  /** Uma role ou várias — as permissões se somam */
  role: RoleName | RoleName[] = 'admin',
  overrides: { email?: string; name?: string; passwordHash?: string; created_at?: Date; org?: TestOrg; mustChangePassword?: boolean } = {},
): Promise<TestUser> {
  const n = ++seq
  const name = overrides.name ?? `Usuário ${n}`
  const email = overrides.email ?? `user${n}@teste.com`
  const roles = Array.isArray(role) ? role : [role]
  const { insertedId } = await (await users()).insertOne({
    condo_id: condo._id,
    ...(overrides.org ? { org_id: overrides.org._id } : {}),
    ...(overrides.mustChangePassword ? { must_change_password: true } : {}),
    name,
    email,
    password_hash: overrides.passwordHash ?? PASSWORD_HASH,
    role_ids: await Promise.all(roles.map(async (r) => (await getRole(r))._id)),
    status_id: (await getStatus('active'))._id,
    created_at: overrides.created_at ?? new Date(),
  })
  return { _id: insertedId, name, email, roles, condo }
}

export async function createResident(condo: TestCondo, name = `Morador ${++seq}`) {
  const doc = {
    condo_id: condo._id,
    name,
    apartment: '101',
    bloco: 'A',
    whatsapp: '+5511999990000',
    status_id: (await getStatus('active'))._id,
    created_at: new Date(),
    created_by: new ObjectId(),
  }
  const { insertedId } = await (await residents()).insertOne(doc)
  return { _id: insertedId, ...doc }
}

export async function createPackage(
  condo: TestCondo,
  residentId: ObjectId,
  overrides: { delivery_pin?: string | null; public_token?: string | null } = {},
) {
  const _id = new ObjectId()
  const doc = {
    _id,
    condo_id: condo._id,
    resident_id: residentId,
    code: `PKG-${_id.toString().slice(-6).toUpperCase()}`,
    ...(overrides.delivery_pin === null ? {} : { delivery_pin: overrides.delivery_pin ?? '123456' }),
    ...(overrides.public_token === null
      ? {}
      : { public_token: overrides.public_token ?? `tok_${_id.toString()}` }),
    qrcode_url: 'https://test-bucket.s3.us-east-1.amazonaws.com/qr.png',
    photo_url: 'https://test-bucket.s3.us-east-1.amazonaws.com/foto.jpg',
    status_id: (await getStatus('arrived'))._id,
    arrived_at: new Date(),
    arrived_by: new ObjectId(),
    created_at: new Date(),
  }
  await (await packages()).insertOne(doc)
  return doc
}

/** Coloca no "request atual" o cookie de sessão desse usuário. */
export async function loginAs(user: TestUser): Promise<string> {
  const token = await signToken({
    sub: user._id.toString(),
    name: user.name,
    roles: user.roles,
    condo_id: user.condo._id.toString(),
    condo_name: user.condo.name,
  })
  requestState.cookies.set(AUTH_COOKIE, token)
  return token
}

export function logout(): void {
  requestState.cookies.delete(AUTH_COOKIE)
}

export function jsonRequest(
  method: string,
  body?: unknown,
  headers: Record<string, string> = {},
  url = 'http://localhost/api/test',
): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.0.0.1', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export function formRequest(form: FormData): NextRequest {
  return new NextRequest('http://localhost/api/test', { method: 'POST', body: form })
}

export function routeCtx(id: string | ObjectId) {
  return { params: Promise.resolve({ id: id.toString() }) }
}

/** URL de foto que /api/upload devolveria para esse condomínio. */
export function photoUrl(condo: TestCondo): string {
  return `https://test-bucket.s3.us-east-1.amazonaws.com/condos/${condo._id.toString()}/packages/photos/foto.jpg`
}

// Bytes mínimos que passam na checagem de formato
export const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0])
export const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0, 0])
export const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0, 0])

export function imageForm(bytes: Uint8Array<ArrayBuffer>, type = 'image/jpeg'): FormData {
  const form = new FormData()
  form.set('file', new Blob([bytes], { type }), 'foto')
  return form
}
