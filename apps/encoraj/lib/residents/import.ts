import { ObjectId } from 'mongodb'
import { residents, type ResidentDoc } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { logActions } from '@/lib/audit/log'
import { formatUnit } from './lookup'
import type { SheetResident } from './sheet'

/** Linha da planilha que não entra, e por quê. */
export interface SkippedResident {
  line: number
  name: string
  unit: string
  note: string
}

export interface ImportPlan {
  toCreate: SheetResident[]
  skipped: SkippedResident[]
}

const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

/** "Bloco 01" e "bloco 1" são a mesma unidade: o Excel tira o zero à esquerda. */
const foldUnit = (text = '') =>
  fold(text)
    .replace(/ /g, '')
    .replace(/^0+(?=.)/, '')

/** Mesmo morador = mesmo nome na mesma unidade, sem ligar para maiúscula, acento ou espaço. */
function residentKey(resident: Pick<ResidentDoc, 'name' | 'apartment' | 'block'>): string {
  return JSON.stringify([fold(resident.name), foldUnit(resident.block), foldUnit(resident.apartment)])
}

/**
 * Separa as linhas da planilha entre quem entra e quem é pulado: morador que já está ativo no
 * condomínio e linha repetida dentro da própria planilha. Só lê — não grava nada.
 */
export async function planResidentImport(condoId: string, rows: SheetResident[]): Promise<ImportPlan> {
  // todos os ativos do condomínio, só nome e unidade: precisa do conjunto inteiro para saber quem já existe
  const existing = await (await residents())
    .find(
      { condo_id: new ObjectId(condoId), status_id: (await getStatus('active'))._id },
      { projection: { name: 1, apartment: 1, block: 1 } },
    )
    .toArray()

  const registered = new Set(existing.map(residentKey))
  const inSheet = new Set<string>()
  const plan: ImportPlan = { toCreate: [], skipped: [] }

  for (const row of rows) {
    const key = residentKey(row)
    const note = registered.has(key) ? 'Já cadastrado.' : inSheet.has(key) ? 'Repetido na planilha.' : null
    if (note) {
      plan.skipped.push({ line: row.line, name: row.name, unit: formatUnit(row), note })
    } else {
      inSheet.add(key)
      plan.toCreate.push(row)
    }
  }
  return plan
}

/**
 * Cadastra os moradores da planilha que ainda não existem no condomínio, com um registro no
 * audit log para cada um, no nome de quem importou. Morador existente nunca é alterado.
 */
export async function importResidents(
  condoId: string,
  actor: { id: string; name: string },
  rows: SheetResident[],
): Promise<{ created: number; skipped: number }> {
  const plan = await planResidentImport(condoId, rows)
  if (plan.toCreate.length === 0) return { created: 0, skipped: plan.skipped.length }

  const condo_id = new ObjectId(condoId)
  const actor_id = new ObjectId(actor.id)
  const status_id = (await getStatus('active'))._id
  const created_at = new Date()

  const docs = plan.toCreate.map(({ name, apartment, block, whatsapp }) => ({
    _id: new ObjectId(),
    condo_id,
    name,
    apartment,
    ...(block ? { block } : {}),
    whatsapp,
    status_id,
    created_at,
    created_by: actor_id,
  }))

  await (await residents()).insertMany(docs)
  await logActions(
    docs.map((doc) => ({
      condo_id,
      entity: 'residents',
      entity_id: doc._id,
      action: 'created',
      actor_id,
      actor_name: actor.name,
      after: doc,
    })),
  )

  return { created: docs.length, skipped: plan.skipped.length }
}
