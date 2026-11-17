import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { users } from '@/lib/db/collections'
import { getStatus, getRole } from '@/lib/db/status-map'
import { logAction } from '@/lib/audit/log'
import { getSession } from '@/lib/auth/session'
import { emailSchema, passwordSchema, EMAIL_COLLATION } from '@/lib/auth/email'

const ALLOWED_ROLES = ['admin', 'zelador', 'porteiro', 'sindico'] as const

const UpdateUserSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: emailSchema.optional(),
  password: passwordSchema.optional(),
  role: z.enum(ALLOWED_ROLES).optional(),
})

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (session.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const body = await request.json()
    const parsed = UpdateUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const col = await users()
    const condoOid = new ObjectId(session.condoId)
    const { _id: activeStatusId } = await getStatus('active')

    // Só usuário ATIVO do próprio condomínio pode ser editado
    const before = await col.findOne({ _id: new ObjectId(id), condo_id: condoOid, status_id: activeStatusId })
    if (!before) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Admin não rebaixa a si mesmo (evita condomínio sem admin)
    if (id === session.userId && parsed.data.role && parsed.data.role !== 'admin') {
      return NextResponse.json({ error: 'Você não pode alterar o seu próprio perfil de acesso.' }, { status: 400 })
    }

    // Email único entre usuários ativos de todos os condomínios
    if (parsed.data.email && parsed.data.email !== before.email) {
      const conflict = await col.findOne(
        { email: parsed.data.email, status_id: activeStatusId, _id: { $ne: new ObjectId(id) } },
        { collation: EMAIL_COLLATION },
      )
      if (conflict) {
        return NextResponse.json({ error: 'Este email já está em uso.' }, { status: 409 })
      }
    }

    const updateFields: Record<string, unknown> = {}

    if (parsed.data.name) updateFields.name = parsed.data.name
    if (parsed.data.email) updateFields.email = parsed.data.email
    if (parsed.data.role) updateFields.role_id = (await getRole(parsed.data.role))._id
    if (parsed.data.password) {
      updateFields.password_hash = await bcrypt.hash(parsed.data.password, 10)
      // Derruba as sessões abertas desse usuário (ver lib/auth/session.ts)
      updateFields.password_changed_at = new Date()
    }

    if (Object.keys(updateFields).length > 0) {
      try {
        await col.updateOne({ _id: new ObjectId(id), condo_id: condoOid }, { $set: updateFields })
      } catch (err) {
        if ((err as { code?: number }).code === 11000) {
          return NextResponse.json({ error: 'Este email já está em uso.' }, { status: 409 })
        }
        throw err
      }
    }

    await logAction({
      condo_id: condoOid,
      entity: 'users',
      entity_id: new ObjectId(id),
      action: 'updated',
      actor_id: new ObjectId(session.userId),
      actor_name: session.userName,
      before: { name: before.name, email: before.email },
      after: {
        name: parsed.data.name,
        email: parsed.data.email,
        role: parsed.data.role,
        ...(parsed.data.password ? { password_changed: true } : {}),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PUT /api/users/[id]]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (session.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
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
    console.error('[DELETE /api/users/[id]]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
