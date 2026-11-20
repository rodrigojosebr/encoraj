import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { users } from '@/lib/db/collections'
import { getStatus, getRole } from '@/lib/db/status-map'
import { logAction } from '@/lib/audit/log'
import { getSession } from '@/lib/auth/session'
import { emailSchema } from '@/lib/auth/email'
import { hashPassword, passwordSchema } from '@/lib/auth/password'
import { ASSIGNABLE_ROLES, canManageUserWith, UNASSIGNABLE_ROLES } from '@/lib/auth/roles'
import { userRoleIds, userRoleNames } from '@/lib/auth/user-roles'
import { can } from '@/lib/auth/permissions'
import { badRequest, conflict, forbidden, notFound, parseBody, serverError, unauthorized } from '@/lib/api/http'

const UpdateUserSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: emailSchema.optional(),
  password: passwordSchema.optional(),
  // Substitui o conjunto de roles de condomínio do usuário. `superadmin` e `administradora` não entram aqui.
  roles: z.array(z.enum(ASSIGNABLE_ROLES)).optional(),
})

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session) return unauthorized()
    if (!can(session, 'users.manage')) return forbidden()
    if (!ObjectId.isValid(id)) {
      return badRequest('ID inválido.')
    }

    const col = await users()
    const condoOid = new ObjectId(session.condoId)
    const { _id: activeStatusId } = await getStatus('active')

    // Só usuário ATIVO do próprio condomínio pode ser editado
    const before = await col.findOne({ _id: new ObjectId(id), condo_id: condoOid, status_id: activeStatusId })
    if (!before) {
      return notFound('Usuário não encontrado.')
    }

    // Ninguém edita quem está acima (super admin, admin da administradora): senão um
    // admin de condomínio trocaria a senha dele e assumiria o lugar.
    const beforeRoles = await userRoleNames(before)
    if (!canManageUserWith(session, beforeRoles)) {
      return forbidden()
    }

    const parsed = await parseBody(request, UpdateUserSchema)
    if (parsed.error) return parsed.error

    // Admin não tira o próprio admin (evita condomínio sem ninguém para administrar)
    if (id === session.userId && beforeRoles.includes('admin') && parsed.data.roles && !parsed.data.roles.includes('admin')) {
      return badRequest('Você não pode remover o seu próprio perfil de administrador.')
    }

    // Email único entre usuários ativos de todos os condomínios
    if (parsed.data.email && parsed.data.email !== before.email) {
      const taken = await col.findOne(
        { email: parsed.data.email, status_id: activeStatusId, _id: { $ne: new ObjectId(id) } },
      )
      if (taken) {
        return conflict('Este email já está em uso.')
      }
    }

    const updateFields: Record<string, unknown> = {}
    const roleNames = parsed.data.roles ? [...new Set(parsed.data.roles)] : undefined

    if (parsed.data.name) updateFields.name = parsed.data.name
    if (parsed.data.email) updateFields.email = parsed.data.email
    if (roleNames) {
      // A tela só mexe nas roles de condomínio. As que ela não atribui (superadmin,
      // morador) ficam exatamente como estão no banco — nem entram, nem saem por aqui.
      const kept = (
        await Promise.all(
          userRoleIds(before).map(async (roleId) => {
            const names = await userRoleNames({ role_ids: [roleId] })
            return names.some((name) => UNASSIGNABLE_ROLES.includes(name)) ? [roleId] : []
          }),
        )
      ).flat()
      const chosen = await Promise.all(roleNames.map(async (name) => (await getRole(name))._id))
      // Sem nenhuma role o usuário não entra: só pode ficar sem role de condomínio quem já
      // tem uma das que a tela não atribui (admin da administradora, super admin)
      if (chosen.length + kept.length === 0) {
        return badRequest('Escolha pelo menos um perfil.')
      }
      updateFields.role_ids = [...chosen, ...kept]
    }
    if (parsed.data.password) {
      updateFields.password_hash = await hashPassword(parsed.data.password)
      // Derruba as sessões abertas desse usuário (ver lib/auth/session.ts)
      updateFields.password_changed_at = new Date()
      // Senha definida por outra pessoa: o dono troca no próximo acesso
      if (id !== session.userId) updateFields.must_change_password = true
    }

    if (Object.keys(updateFields).length > 0) {
      try {
        await col.updateOne(
          { _id: new ObjectId(id), condo_id: condoOid },
          { $set: updateFields },
        )
      /* v8 ignore start -- @preserve: só dispara em corrida entre dois cadastros do mesmo email */
      } catch (err) {
        if ((err as { code?: number }).code === 11000) {
          return conflict('Este email já está em uso.')
        }
        throw err
      }
      /* v8 ignore stop -- @preserve */
    }

    await logAction({
      condo_id: condoOid,
      entity: 'users',
      entity_id: new ObjectId(id),
      action: 'updated',
      actor_id: new ObjectId(session.userId),
      actor_name: session.userName,
      before: { name: before.name, email: before.email, roles: beforeRoles },
      after: {
        name: parsed.data.name,
        email: parsed.data.email,
        roles: roleNames,
        ...(parsed.data.password ? { password_changed: true } : {}),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return serverError('[PUT /api/users/[id]]', err)
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session) return unauthorized()
    if (!can(session, 'users.manage')) return forbidden()
    if (!ObjectId.isValid(id)) {
      return badRequest('ID inválido.')
    }
    // Prevent self-deletion
    if (id === session.userId) {
      return badRequest('Você não pode desativar sua própria conta.')
    }

    const col = await users()
    const condoOid = new ObjectId(session.condoId)
    const [{ _id: activeStatusId }, { _id: deletedStatusId }] = await Promise.all([
      getStatus('active'),
      getStatus('deleted'),
    ])
    const doc = await col.findOne({ _id: new ObjectId(id), condo_id: condoOid, status_id: activeStatusId })
    if (!doc) {
      return notFound('Usuário não encontrado.')
    }
    if (!canManageUserWith(session, await userRoleNames(doc))) {
      return forbidden()
    }

    // A partir daqui getSession() recusa qualquer token desse usuário
    await col.updateOne(
      { _id: new ObjectId(id), condo_id: condoOid },
      { $set: { status_id: deletedStatusId, deleted_at: new Date(), deleted_by: new ObjectId(session.userId) } },
    )

    await logAction({
      condo_id: condoOid,
      entity: 'users',
      entity_id: new ObjectId(id),
      action: 'deleted',
      actor_id: new ObjectId(session.userId),
      actor_name: session.userName,
      before: { name: doc.name, email: doc.email },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return serverError('[DELETE /api/users/[id]]', err)
  }
}
