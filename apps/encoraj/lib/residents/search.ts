/**
 * Busca de morador pelo que o porteiro digita: nome, unidade, ou os dois juntos
 * ("ana", "101", "apto 101", "bloco 2 apto 1").
 *
 * Arquivo puro (sem banco): roda no navegador, sobre a lista que a página já carregou.
 */

export interface SearchableResident {
  name: string
  apartment: string
  block?: string
}

/** Palavras que anunciam a unidade: o valor que vem depois só vale para aquele campo. */
const APARTMENT_WORDS = new Set(['apto', 'apt', 'ap', 'apartamento'])
const BLOCK_WORDS = new Set(['bloco', 'bl'])

interface Criterion {
  field: 'apartment' | 'block' | 'any'
  value: string
}

/** Minúsculas, sem acento, só letras e números — separado em palavras. */
function searchWords(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

function parseQuery(query: string): Criterion[] {
  const words = searchWords(query)
  const criteria: Criterion[] = []
  for (let i = 0; i < words.length; i++) {
    const field = APARTMENT_WORDS.has(words[i]) ? 'apartment' : BLOCK_WORDS.has(words[i]) ? 'block' : 'any'
    if (field === 'any') criteria.push({ field, value: words[i] })
    // "apto"/"bloco" sem valor depois é alguém ainda digitando: não filtra nada
    else if (i + 1 < words.length) criteria.push({ field, value: words[++i] })
  }
  return criteria
}

/** Quantos critérios batem por inteiro (não só pelo começo); null se algum não bate. */
function matchScore(resident: SearchableResident, criteria: Criterion[]): number | null {
  const apartmentWords = searchWords(resident.apartment)
  const blockWords = searchWords(resident.block ?? '')
  const fields = {
    apartment: [apartmentWords.join('')],
    block: [blockWords.join('')],
    any: [...searchWords(resident.name), ...apartmentWords, ...blockWords],
  }

  let score = 0
  for (const { field, value } of criteria) {
    const candidates = fields[field]
    if (!candidates.some((candidate) => candidate.startsWith(value))) return null
    if (candidates.includes(value)) score++
  }
  return score
}

/**
 * Moradores que batem com TUDO que foi digitado, cada palavra pelo começo: "10" acha o
 * apto 101, "ana so" acha Ana Souza. Depois de "apto" ou "bloco", o valor só vale para
 * aquele campo — "bloco 2 apto 1" não traz o apto 201 do bloco 1.
 *
 * Quem bate por inteiro vem primeiro (apto 1 antes do 10 e do 101); no empate fica a
 * ordem de entrada. Devolve `null` quando ainda não há o que buscar.
 */
export function searchResidents<T extends SearchableResident>(residents: readonly T[], query: string): T[] | null {
  const criteria = parseQuery(query)
  if (criteria.length === 0) return null

  const matches: Array<{ resident: T; score: number }> = []
  for (const resident of residents) {
    const score = matchScore(resident, criteria)
    if (score !== null) matches.push({ resident, score })
  }
  return matches.sort((a, b) => b.score - a.score).map((match) => match.resident)
}
