import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { headers } from 'next/headers'
import { residents } from '@/lib/db/collections'
import { logAction } from '@/lib/audit/log'

const CreateResidentSchema = z.object({
  name: z.string().min(2),
  apartment: z.string().min(1),
  whatsapp: z.string().min(1),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()

    const headersList = await headers()
    const condoId = headersList.get('x-condo-id')
    if (!condoId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const col = await residents()
    const filter: Record<string, unknown> = { active: true, condo_id: new ObjectId(condoId) }

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { apartment: { $regex: q, $options: 'i' } },
      ]
    }

    const docs = await col.find(filter).sort({ name: 1 }).toArray()
    return NextResponse.json(docs)
  } catch (err) {
    console.error('[GET /api/residents]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const headersList = await headers()
    const role = headersList.get('x-user-role')
    const actorId = headersList.get('x-user-id')
    const actorName = headersList.get('x-user-name')
    const condoId = headersList.get('x-condo-id')

    if (!role || !actorId || !actorName || !condoId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    if (role !== 'admin' && role !== 'zelador') {
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
      active: true,
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
    console.error('[POST /api/residents]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
