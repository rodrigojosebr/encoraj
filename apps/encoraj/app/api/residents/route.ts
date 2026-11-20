import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { residents } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { getSession } from '@/lib/auth/session'
import { logAction } from '@/lib/audit/log'
import { can } from '@/lib/auth/permissions'
import { forbidden, parseBody, serverError, unauthorized } from '@/lib/api/http'

const CreateResidentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  apartment: z.string().trim().min(1).max(20),
  block: z.string().trim().max(20).optional(),
  whatsapp: z.string().trim().min(8).max(20),
})

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return unauthorized()
    }
    const { userId: actorId, userName: actorName, condoId } = session

    if (!can(session, 'residents.write')) {
      return forbidden()
    }

    const parsed = await parseBody(request, CreateResidentSchema)
    if (parsed.error) return parsed.error

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
    return serverError('[POST /api/residents]', err)
  }
}
