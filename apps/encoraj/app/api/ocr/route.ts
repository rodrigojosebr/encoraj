import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { residents } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { analyzePackageLabel, type ResidentContext } from '@/lib/gemini/ocr'
import { getSession } from '@/lib/auth/session'
import { readImageUpload } from '@/lib/upload/image'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (session.role !== 'porteiro' && session.role !== 'admin') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }
    const condoId = session.condoId

    const image = await readImageUpload(request)
    if ('error' in image) {
      return NextResponse.json({ error: image.error }, { status: 400 })
    }

    const base64 = image.buffer.toString('base64')

    // Fetch residents for this condo only
    const activeStatus = await getStatus('active')
    const col = await residents()
    const docs = await col
      .find({ condo_id: new ObjectId(condoId), status_id: activeStatus._id })
      .sort({ name: 1 })
      .toArray()

    if (docs.length === 0) {
      return NextResponse.json({ match: null, confidence: 'low', extracted_text: '' })
    }

    const residentContexts: ResidentContext[] = docs.map((r) => ({
      id: r._id!.toString(),
      name: r.name,
      apartment: r.apartment,
      bloco: r.bloco,
    }))

    const result = await analyzePackageLabel(base64, image.contentType, residentContexts)

    if (!result) {
      return NextResponse.json({ match: null, confidence: 'low', extracted_text: '', error: 'ocr_unavailable' })
    }

    // Build label for the matched resident
    const matched = docs.find((r) => r._id!.toString() === result.resident_id)
    if (!matched) {
      return NextResponse.json({ match: null, confidence: 'low', extracted_text: result.extracted_text })
    }

    const label = matched.bloco
      ? `${matched.name} — Bloco ${matched.bloco}, Apto ${matched.apartment}`
      : `${matched.name} — Apto ${matched.apartment}`

    return NextResponse.json({
      match: { value: result.resident_id, label },
      confidence: result.confidence,
      extracted_text: result.extracted_text,
    })
  } catch (err) {
    console.error('[POST /api/ocr]', err)
    return NextResponse.json({ match: null, confidence: 'low', extracted_text: '', error: 'ocr_unavailable' })
  }
}
