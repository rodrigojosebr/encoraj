import type { ObjectId } from 'mongodb'
import { condominiums, organizations, users } from '@/lib/db/collections'
import { getRole, getStatus } from '@/lib/db/status-map'
import { ORG_ADMIN_ROLE } from '@/lib/auth/roles'
import { toSlug } from '@/lib/text/slug'
import { hashPassword } from '@/lib/auth/password'

/**
 * Como condomínios e administradoras passam a existir. Não há cadastro público:
 *  - condomínio autogerido (com o admin dele) e administradora (com o primeiro condomínio
 *    e o admin dela) → só o super admin;
 *  - condomínio dentro de uma administradora → o admin dela (ou o super admin).
 */

export interface NewAdminInput {
  adminName: string
  adminEmail: string
  adminPassword: string
}

type Failure = { ok: false; reason: 'email_in_use' }

async function emailInUse(email: string): Promise<boolean> {
  // Email é único entre usuários ativos de todos os condomínios
  const { _id: activeStatusId } = await getStatus('active')
  return !!(await (await users()).findOne({ email, status_id: activeStatusId }, { projection: { _id: 1 } }))
}

async function insertCondo(name: string, orgId?: ObjectId): Promise<{ condoId: ObjectId; slug: string }> {
  const condosCol = await condominiums()
  // Slug único: sufixo numérico se o nome já existir
  const baseSlug = toSlug(name) || 'condominio'
  let slug = baseSlug
  let suffix = 2
  while (await condosCol.findOne({ slug })) {
    slug = `${baseSlug}-${suffix++}`
  }

  const { insertedId } = await condosCol.insertOne({
    ...(orgId ? { org_id: orgId } : {}),
    name,
    slug,
    status_id: (await getStatus('active'))._id,
    created_at: new Date(),
  })
  return { condoId: insertedId, slug }
}

async function insertAdmin(input: NewAdminInput, condoId: ObjectId, orgId?: ObjectId): Promise<ObjectId> {
  // Admin de administradora tem a role dela e o org_id; admin de autogerido, a role `admin`
  const role = await getRole(orgId ? ORG_ADMIN_ROLE : 'admin')
  const { insertedId } = await (await users()).insertOne({
    condo_id: condoId,
    ...(orgId ? { org_id: orgId } : {}),
    name: input.adminName,
    email: input.adminEmail,
    password_hash: await hashPassword(input.adminPassword),
    role_ids: [role._id],
    // Quem criou conhece esta senha: o admin troca no primeiro acesso
    must_change_password: true,
    status_id: (await getStatus('active'))._id,
    created_at: new Date(),
  })
  return insertedId
}

/** Condomínio AUTOGERIDO: sem administradora, com o próprio admin. */
export async function createCondoWithAdmin(
  input: NewAdminInput & { condoName: string },
): Promise<{ ok: true; condoId: ObjectId; adminId: ObjectId; slug: string } | Failure> {
  if (await emailInUse(input.adminEmail)) return { ok: false, reason: 'email_in_use' }

  const { condoId, slug } = await insertCondo(input.condoName)
  try {
    return { ok: true, condoId, adminId: await insertAdmin(input, condoId), slug }
  /* v8 ignore start -- @preserve: só dispara em corrida entre dois cadastros do mesmo email */
  } catch (err) {
    // Não deixa condomínio órfão, sem administrador
    await (await condominiums()).deleteOne({ _id: condoId })
    if ((err as { code?: number }).code === 11000) return { ok: false, reason: 'email_in_use' }
    throw err
  }
  /* v8 ignore stop -- @preserve */
}

/**
 * ADMINISTRADORA: nasce com o primeiro condomínio e com o admin dela. O admin precisa de
 * um condomínio para "morar" (é onde cai ao fazer login), por isso os três vêm juntos.
 */
export async function createOrganizationWithAdmin(
  input: NewAdminInput & { orgName: string; condoName: string },
): Promise<{ ok: true; orgId: ObjectId; condoId: ObjectId; adminId: ObjectId; slug: string } | Failure> {
  if (await emailInUse(input.adminEmail)) return { ok: false, reason: 'email_in_use' }

  const orgsCol = await organizations()
  const { insertedId: orgId } = await orgsCol.insertOne({
    name: input.orgName,
    status_id: (await getStatus('active'))._id,
    created_at: new Date(),
  })
  const { condoId, slug } = await insertCondo(input.condoName, orgId)
  try {
    return { ok: true, orgId, condoId, adminId: await insertAdmin(input, condoId, orgId), slug }
  /* v8 ignore start -- @preserve: só dispara em corrida entre dois cadastros do mesmo email */
  } catch (err) {
    await (await condominiums()).deleteOne({ _id: condoId })
    await orgsCol.deleteOne({ _id: orgId })
    if ((err as { code?: number }).code === 11000) return { ok: false, reason: 'email_in_use' }
    throw err
  }
  /* v8 ignore stop -- @preserve */
}

/** Mais um condomínio dentro de uma administradora que já existe. Quem administra é o admin dela. */
export async function createCondoInOrganization(orgId: ObjectId, condoName: string) {
  return insertCondo(condoName, orgId)
}
