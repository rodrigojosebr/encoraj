import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { headers } from 'next/headers'
import { residents } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { analyzePackageLabel, type ResidentContext } from '@/lib/gemini/ocr'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(request: Request) {
  try {
    const headersList = await headers()
    const condoId = headersList.get('x-condo-id')
    const role = headersList.get('x-user-role')

    if (!condoId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (role !== 'porteiro' && role !== 'admin') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Arquivo não enviado.' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de arquivo inválido.' }, { status: 400 })
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Arquivo muito grande (máx 10 MB).' }, { status: 400 })
    }

    // Convert to base64
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

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

    const result = await analyzePackageLabel(base64, file.type, residentContexts)

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
