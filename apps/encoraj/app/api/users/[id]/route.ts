import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { users } from '@/lib/db/collections'
import { getStatus, getRole } from '@/lib/db/status-map'
import { logAction } from '@/lib/audit/log'
import { getSession } from '@/lib/auth/session'
import { emailSchema, passwordSchema } from '@/lib/auth/email'
import { reportError } from '@/lib/observability/report'
import { ASSIGNABLE_ROLES, canManageUserWith, UNASSIGNABLE_ROLES } from '@/lib/auth/roles'
import { userRoleIds, userRoleNames } from '@/lib/auth/user-roles'
import { can } from '@/lib/auth/permissions'

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
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (!can(session, 'users.manage')) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const col = await users()
    const condoOid = new ObjectId(session.condoId)
    const { _id: activeStatusId } = await getStatus('active')

    // Só usuário ATIVO do próprio condomínio pode ser editado
    const before = await col.findOne({ _id: new ObjectId(id), condo_id: condoOid, status_id: activeStatusId })
    if (!before) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Ninguém edita quem está acima (super admin, admin da administradora): senão um
    // admin de condomínio trocaria a senha dele e assumiria o lugar.
    const beforeRoles = await userRoleNames(before)
    if (!canManageUserWith(session, beforeRoles)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = UpdateUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    // Admin não tira o próprio admin (evita condomínio sem ninguém para administrar)
    if (id === session.userId && beforeRoles.includes('admin') && parsed.data.roles && !parsed.data.roles.includes('admin')) {
      return NextResponse.json({ error: 'Você não pode remover o seu próprio perfil de administrador.' }, { status: 400 })
    }

    // Email único entre usuários ativos de todos os condomínios
    if (parsed.data.email && parsed.data.email !== before.email) {
      const conflict = await col.findOne(
        { email: parsed.data.email, status_id: activeStatusId, _id: { $ne: new ObjectId(id) } },
      )
      if (conflict) {
        return NextResponse.json({ error: 'Este email já está em uso.' }, { status: 409 })
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
        return NextResponse.json({ error: 'Escolha pelo menos um perfil.' }, { status: 400 })
      }
      updateFields.role_ids = [...chosen, ...kept]
    }
    if (parsed.data.password) {
      updateFields.password_hash = await bcrypt.hash(parsed.data.password, 10)
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
          return NextResponse.json({ error: 'Este email já está em uso.' }, { status: 409 })
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
    await reportError('[PUT /api/users/[id]]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (!can(session, 'users.manage')) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }
    // Prevent self-deletion
    if (id === session.userId) {
      return NextResponse.json({ error: 'Você não pode desativar sua própria conta' }, { status: 400 })
    }

    const col = await users()
    const condoOid = new ObjectId(session.condoId)
    const [{ _id: activeStatusId }, { _id: deletedStatusId }] = await Promise.all([
      getStatus('active'),
      getStatus('deleted'),
    ])
    const doc = await col.findOne({ _id: new ObjectId(id), condo_id: condoOid, status_id: activeStatusId })
    if (!doc) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }
    if (!canManageUserWith(session, await userRoleNames(doc))) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
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
    await reportError('[DELETE /api/users/[id]]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
