import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { users } from '@/lib/db/collections'
import { getStatus, getRole } from '@/lib/db/status-map'
import { logAction } from '@/lib/audit/log'
import { getSession } from '@/lib/auth/session'
import { emailSchema } from '@/lib/auth/email'
import { hashPassword, passwordSchema } from '@/lib/auth/password'
import { ASSIGNABLE_ROLES } from '@/lib/auth/roles'
import { can } from '@/lib/auth/permissions'
import { conflict, forbidden, parseBody, serverError, unauthorized } from '@/lib/api/http'

const CreateUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: emailSchema,
  password: passwordSchema,
  // As permissões se somam: um usuário pode ter várias roles. `superadmin` não entra aqui.
  roles: z.array(z.enum(ASSIGNABLE_ROLES)).min(1, 'Escolha pelo menos um perfil.'),
})

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return unauthorized()
    if (!can(session, 'users.manage')) return forbidden()

    const parsed = await parseBody(request, CreateUserSchema)
    if (parsed.error) return parsed.error

    const col = await users()
    const roleNames = [...new Set(parsed.data.roles)]
    const [{ _id: activeStatusId }, roleDocs] = await Promise.all([
      getStatus('active'),
      Promise.all(roleNames.map((name) => getRole(name))),
    ])

    // Email único entre usuários ativos de TODOS os condomínios: quem ainda está ativo
    // em outro condomínio precisa ser desativado lá antes de ser cadastrado aqui.
    const existing = await col.findOne(
      { email: parsed.data.email, status_id: activeStatusId },
    )
    if (existing) {
      return conflict('Este email já está em uso.')
    }

    const password_hash = await hashPassword(parsed.data.password)
    const now = new Date()
    const doc = {
      condo_id: new ObjectId(session.condoId),
      name: parsed.data.name,
      email: parsed.data.email,
      password_hash,
      role_ids: roleDocs.map((role) => role._id),
      status_id: activeStatusId,
      // Quem cadastrou conhece esta senha: o dono troca no primeiro acesso
      must_change_password: true,
      created_at: now,
    }

    let insertedId
    try {
      insertedId = (await col.insertOne(doc)).insertedId
    /* v8 ignore start -- @preserve: só dispara em corrida entre dois cadastros do mesmo email */
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        return conflict('Este email já está em uso.')
      }
      throw err
    }
    /* v8 ignore stop -- @preserve */

    await logAction({
      condo_id: new ObjectId(session.condoId),
      entity: 'users',
      entity_id: insertedId,
      action: 'created',
      actor_id: new ObjectId(session.userId),
      actor_name: session.userName,
      after: { name: doc.name, email: doc.email, roles: roleNames },
    })

    return NextResponse.json({ _id: insertedId }, { status: 201 })
  } catch (err) {
    return serverError('[POST /api/users]', err)
  }
}
