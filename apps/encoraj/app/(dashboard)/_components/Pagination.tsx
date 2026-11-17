import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { css } from '@/styled-system/css'
import { pageHref, type Pagination as PaginationInfo } from '@/lib/pagination'

interface PaginationProps {
  pathname: string
  /** Filtros atuais da URL — preservados nos links */
  params: Record<string, string | undefined>
  pagination: PaginationInfo
}

const linkCss = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '1',
  px: '3',
  py: '1.5',
  fontSize: 'sm',
  fontWeight: 'medium',
  borderRadius: 'md',
  border: '1px solid',
  borderColor: 'gray.300',
  bg: 'white',
  color: 'gray.700',
  textDecoration: 'none',
  _hover: { bg: 'gray.50', borderColor: 'gray.400' },
  _dark: { bg: 'gray.900', borderColor: 'gray.700', color: 'gray.200', _hover: { bg: 'gray.800' } },
})

const disabledCss = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '1',
  px: '3',
  py: '1.5',
  fontSize: 'sm',
  fontWeight: 'medium',
  borderRadius: 'md',
  border: '1px solid',
  borderColor: 'gray.200',
  color: 'gray.400',
  cursor: 'not-allowed',
  _dark: { borderColor: 'gray.800', color: 'gray.600' },
})

export default function Pagination({ pathname, params, pagination }: PaginationProps) {
  const { page, totalPages, total, from, to } = pagination
  if (total === 0) return null

  return (
    <nav
      aria-label="Paginação"
      className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '3' })}
    >
      <p className={css({ fontSize: 'sm', color: 'gray.600', _dark: { color: 'gray.400' } })}>
        {from}–{to} de {total}
      </p>

      {totalPages > 1 && (
        <div className={css({ display: 'flex', alignItems: 'center', gap: '2' })}>
          {page > 1 ? (
            <Link href={pageHref(pathname, params, page - 1)} className={linkCss} rel="prev">
              <ChevronLeft size={16} /> Anterior
            </Link>
          ) : (
            <span className={disabledCss} aria-disabled="true">
              <ChevronLeft size={16} /> Anterior
            </span>
          )}

          <span className={css({ fontSize: 'sm', color: 'gray.600', _dark: { color: 'gray.400' } })}>
            {page} / {totalPages}
          </span>

          {page < totalPages ? (
            <Link href={pageHref(pathname, params, page + 1)} className={linkCss} rel="next">
              Próxima <ChevronRight size={16} />
            </Link>
          ) : (
            <span className={disabledCss} aria-disabled="true">
              Próxima <ChevronRight size={16} />
            </span>
          )}
        </div>
      )}
    </nav>
  )
}
