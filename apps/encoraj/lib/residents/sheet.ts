import { csvDocument, parseCsv } from '@/lib/text/csv'
import { toSlug } from '@/lib/text/slug'
import { RESIDENT_LIMITS } from './schema'

/**
 * Planilha de moradores (CSV): o modelo que a pessoa baixa e a leitura do arquivo preenchido.
 * Arquivo puro, sem banco — quem decide o que entra é lib/residents/import.ts.
 */
export const MAX_SHEET_BYTES = 1024 * 1024
export const MAX_SHEET_ROWS = 2000

type Field = 'name' | 'block' | 'apartment' | 'whatsapp'

/**
 * Colunas do modelo, na ordem. Na leitura cada coluna é achada pela primeira palavra do
 * título, então a ordem pode mudar e "Telefone" ou "Unidade" também servem.
 */
const COLUMNS: Array<{ field: Field; title: string; hint?: string; words: string[] }> = [
  { field: 'name', title: 'Nome', words: ['nome', 'morador'] },
  { field: 'block', title: 'Bloco', hint: 'opcional', words: ['bloco', 'torre'] },
  { field: 'apartment', title: 'Apartamento', words: ['apartamento', 'apto', 'ap', 'unidade'] },
  { field: 'whatsapp', title: 'WhatsApp', hint: 'DDD + número', words: ['whatsapp', 'telefone', 'celular'] },
]
const REQUIRED = COLUMNS.filter((column) => column.field !== 'block')

/** O modelo: só a linha de títulos. Linha de exemplo acabaria importada como morador. */
export function residentSheetTemplate(): string {
  return csvDocument(COLUMNS.map(({ title, hint }) => (hint ? `${title} (${hint})` : title)), [])
}

export interface SheetResident {
  /** Linha na planilha, como o Excel numera (a dos títulos é a 1) */
  line: number
  name: string
  apartment: string
  block?: string
  /** Já no formato gravado: +55 + DDD + número */
  whatsapp: string
}

export interface SheetProblem {
  line: number
  message: string
}

/** `error` = o arquivo inteiro não serve. `problems` = linhas a corrigir. */
export type SheetReading = { rows: SheetResident[]; problems: SheetProblem[] } | { error: string }

/** Excel grava número comprido do jeito que mostra na célula: "5,51199E+12". */
const SCIENTIFIC = /\dE\+?\d/i

/** DDD + 9 dígitos, com ou sem 55 na frente, em qualquer pontuação → +5511999990000. */
function normalizeWhatsapp(raw: string): string | null {
  if (SCIENTIFIC.test(raw)) return null
  const digits = raw.replace(/\D/g, '').replace(/^0+/, '')
  if (digits.length === 11) return `+55${digits}`
  if (digits.length === 13 && digits.startsWith('55')) return `+${digits}`
  return null
}

function whatsappProblem(raw: string): string {
  if (!raw) return 'Falta o WhatsApp.'
  const shown = `WhatsApp "${raw.slice(0, 30)}"`
  return SCIENTIFIC.test(raw)
    ? `${shown}: o Excel trocou o número por notação científica. Formate a coluna como Texto e digite de novo.`
    : `${shown}: use DDD + número, 11 dígitos (ex.: 11999990000).`
}

/** Excel salva em UTF-8 ou, no "CSV (separado por vírgulas)" do Windows, em Windows-1252. */
function decode(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

const isBlank = (cells: string[]) => cells.every((cell) => cell.trim() === '')

/** Lê e valida a planilha enviada. Não consulta o banco: quem já existe é outra etapa. */
export function readResidentSheet(bytes: Uint8Array): SheetReading {
  // byte nulo logo no começo: planilha do Excel (.xlsx, .xls) ou outro arquivo que não é texto
  if (bytes.subarray(0, 1024).includes(0)) {
    return { error: 'Este arquivo não é CSV. No Excel: Arquivo → Salvar como → "CSV UTF-8 (delimitado por vírgulas)".' }
  }

  const table = parseCsv(decode(bytes))
  const headerIndex = table.findIndex((cells) => !isBlank(cells))
  if (headerIndex === -1) return { error: 'A planilha está vazia.' }

  const columnOf = new Map<Field, number>()
  table[headerIndex].forEach((title, index) => {
    const firstWord = toSlug(title).split('-')[0]
    const column = COLUMNS.find(({ words }) => words.includes(firstWord))
    // título repetido: vale a primeira coluna
    if (column && !columnOf.has(column.field)) columnOf.set(column.field, index)
  })

  const missing = REQUIRED.filter((column) => !columnOf.has(column.field)).map((column) => column.title)
  if (missing.length > 0) {
    const names = new Intl.ListFormat('pt-BR', { type: 'conjunction' }).format(missing)
    return {
      error: `Não encontrei ${missing.length === 1 ? 'a coluna' : 'as colunas'} ${names}. Baixe o modelo e preencha nele, sem mudar os títulos.`,
    }
  }

  // linha em branco é pulada, mas o número de cada linha continua o do Excel
  const filled = table
    .map((cells, index) => ({ cells, line: index + 1 }))
    .filter(({ cells, line }) => line > headerIndex + 1 && !isBlank(cells))
  if (filled.length === 0) return { error: 'A planilha não tem nenhum morador. Preencha uma linha por morador, abaixo dos títulos.' }
  if (filled.length > MAX_SHEET_ROWS) {
    return { error: `A planilha tem mais de ${MAX_SHEET_ROWS.toLocaleString('pt-BR')} moradores. Divida em arquivos menores.` }
  }

  const { nameMin, nameMax, unitMax } = RESIDENT_LIMITS
  const rows: SheetResident[] = []
  const problems: SheetProblem[] = []

  for (const { cells, line } of filled) {
    const read = (field: Field) => {
      const index = columnOf.get(field)
      return index === undefined ? '' : (cells[index] ?? '').replace(/\s+/g, ' ').trim()
    }
    const [name, apartment, block] = [read('name'), read('apartment'), read('block')]
    const rawWhatsapp = read('whatsapp')
    const whatsapp = normalizeWhatsapp(rawWhatsapp)

    const found: string[] = []
    if (name.length < nameMin || name.length > nameMax) {
      found.push(name ? `Nome: use de ${nameMin} a ${nameMax} caracteres.` : 'Falta o nome.')
    }
    if (!apartment || apartment.length > unitMax) {
      found.push(apartment ? `Apartamento: use até ${unitMax} caracteres.` : 'Falta o apartamento.')
    }
    if (block.length > unitMax) found.push(`Bloco: use até ${unitMax} caracteres.`)
    if (!whatsapp) found.push(whatsappProblem(rawWhatsapp))

    if (whatsapp && found.length === 0) {
      rows.push({ line, name, apartment, ...(block ? { block } : {}), whatsapp })
    } else {
      for (const message of found) problems.push({ line, message })
    }
  }

  return { rows, problems }
}
