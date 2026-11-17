export const PAGE_SIZE = 25

export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
  /** Para o `.skip()` da query */
  skip: number
  /** Posição do primeiro e do último item exibidos (1-based); 0 quando não há itens */
  from: number
  to: number
}

/** `?page=` da URL → inteiro ≥ 1. Qualquer coisa inválida vira 1. */
export function parsePage(raw: string | string[] | undefined): number {
  const value = Number(Array.isArray(raw) ? raw[0] : raw)
  return Number.isInteger(value) && value >= 1 ? value : 1
}

/** Página pedida além do fim cai na última página existente. */
export function paginate(total: number, requestedPage: number, pageSize = PAGE_SIZE): Pagination {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(Math.max(1, requestedPage), totalPages)
  const skip = (page - 1) * pageSize

  return {
    page,
    pageSize,
    total,
    totalPages,
    skip,
    from: total === 0 ? 0 : skip + 1,
    to: Math.min(skip + pageSize, total),
  }
}

/** Monta o link de uma página preservando os filtros atuais (vazios e `page=1` ficam de fora). */
export function pageHref(
  pathname: string,
  params: Record<string, string | undefined>,
  page: number,
): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== 'page') query.set(key, value)
  }
  if (page > 1) query.set('page', String(page))

  const qs = query.toString()
  return qs ? `${pathname}?${qs}` : pathname
}
