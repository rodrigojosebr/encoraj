import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { escapeRegex } from '@/lib/db/escape-regex'
import { residents } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { getSession } from '@/lib/auth/session'
import { logAction } from '@/lib/audit/log'
import { reportError } from '@/lib/observability/report'
import { can } from '@/lib/auth/permissions'

const CreateResidentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  apartment: z.string().trim().min(1).max(20),
  bloco: z.string().trim().max(20).optional(),
  whatsapp: z.string().trim().min(8).max(20),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()

    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (!can(session, 'residents.read')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }
    const { condoId } = session

    const col = await residents()
    const filter: Record<string, unknown> = {
      status_id: (await getStatus('active'))._id,
      condo_id: new ObjectId(condoId),
    }

    if (q) {
      const regex = { $regex: escapeRegex(q), $options: 'i' }
      filter.$or = [{ name: regex }, { apartment: regex }]
    }

    const docs = await col.find(filter).sort({ name: 1 }).toArray()
    return NextResponse.json(docs)
  } catch (err) {
    await reportError('[GET /api/residents]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const { userId: actorId, userName: actorName, condoId } = session

    if (!can(session, 'residents.write')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = CreateResidentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const col = await residents()
    const now = new Date()
    const doc = {
      ...parsed.data,
      condo_id: new ObjectId(condoId),
      status_id: (await getStatus('active'))._id,
      created_at: now,
      created_by: new ObjectId(actorId),
    }

    const result = await col.insertOne(doc)

    await logAction({
      condo_id: new ObjectId(condoId),
      entity: 'residents',
      entity_id: result.insertedId,
      action: 'created',
      actor_id: new ObjectId(actorId),
      actor_name: actorName,
      after: doc as Record<string, unknown>,
    })

    return NextResponse.json({ _id: result.insertedId }, { status: 201 })
  } catch (err) {
    await reportError('[POST /api/residents]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
