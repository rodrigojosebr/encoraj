import { ObjectId } from 'mongodb'
import { residents, type ResidentDoc } from '@/lib/db/collections'

export type ResidentSummary = Pick<ResidentDoc, 'name' | 'apartment' | 'block'> & { _id: ObjectId }

/**
 * Moradores citados numa lista (encomendas, relatórios), indexados pelo id em texto.
 * Sempre filtrado pelo condomínio: id de outro condomínio simplesmente não aparece.
 */
export async function getResidentMap(condoId: string | ObjectId, ids: ObjectId[]): Promise<Map<string, ResidentSummary>> {
  const unique = [...new Map(ids.map((id) => [id.toString(), id])).values()]
  if (unique.length === 0) return new Map()

  const docs = await (await residents())
    .find(
      { _id: { $in: unique }, condo_id: new ObjectId(condoId) },
      { projection: { name: 1, apartment: 1, block: 1 } },
    )
    .toArray()
  return new Map(docs.map((r) => [r._id.toString(), r as ResidentSummary]))
}

/** Unidade do morador, do mesmo jeito em toda tela e export: "Bloco A · Apto 101" ou "Apto 101". */
export function formatUnit(resident: Pick<ResidentDoc, 'apartment' | 'block'>): string {
  const block = resident.block?.trim()
  return block ? `Bloco ${block} · Apto ${resident.apartment}` : `Apto ${resident.apartment}`
}

/** Morador com a unidade, para opções de seleção: "Ana — Bloco A · Apto 101". */
export function residentLabel(resident: Pick<ResidentDoc, 'name' | 'apartment' | 'block'>): string {
  return `${resident.name} — ${formatUnit(resident)}`
}
