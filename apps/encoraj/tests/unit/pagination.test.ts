import { describe, expect, it } from 'vitest'
import { PAGE_SIZE, pageHref, paginate, parsePage } from '@/lib/pagination'

describe('parsePage', () => {
  it.each([
    ['1', 1],
    ['7', 7],
    [['3', '9'], 3],
    [undefined, 1],
    ['', 1],
    ['0', 1],
    ['-2', 1],
    ['2.5', 1],
    ['abc', 1],
    ['1e999', 1],
  ])('%j → %i', (raw, expected) => {
    expect(parsePage(raw)).toBe(expected)
  })
})

describe('paginate', () => {
  it('lista vazia', () => {
    expect(paginate(0, 1)).toEqual({ page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 1, skip: 0, from: 0, to: 0 })
  })

  it('primeira, do meio e última página', () => {
    expect(paginate(60, 1, 25)).toMatchObject({ page: 1, totalPages: 3, skip: 0, from: 1, to: 25 })
    expect(paginate(60, 2, 25)).toMatchObject({ page: 2, skip: 25, from: 26, to: 50 })
    expect(paginate(60, 3, 25)).toMatchObject({ page: 3, skip: 50, from: 51, to: 60 })
  })

  it('total exato de uma página não cria página vazia', () => {
    expect(paginate(25, 1, 25)).toMatchObject({ totalPages: 1, from: 1, to: 25 })
  })

  it('página além do fim cai na última; abaixo de 1 cai na primeira', () => {
    expect(paginate(60, 99, 25)).toMatchObject({ page: 3, skip: 50 })
    expect(paginate(60, 0, 25)).toMatchObject({ page: 1, skip: 0 })
  })
})

describe('pageHref', () => {
  it('preserva filtros, descarta vazios e omite page=1', () => {
    const params = { status: 'open', q: 'maria silva', period: undefined, from: '' }
    expect(pageHref('/packages', params, 1)).toBe('/packages?status=open&q=maria+silva')
    expect(pageHref('/packages', params, 3)).toBe('/packages?status=open&q=maria+silva&page=3')
  })

  it('sem filtros', () => {
    expect(pageHref('/residents', {}, 1)).toBe('/residents')
    expect(pageHref('/residents', {}, 2)).toBe('/residents?page=2')
  })

  it('ignora um page que venha junto com os filtros', () => {
    expect(pageHref('/reports', { page: '9', status: 'open' }, 2)).toBe('/reports?status=open&page=2')
  })
})
