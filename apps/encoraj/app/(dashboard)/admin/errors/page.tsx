import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Filter } from 'mongodb'
import { css } from '@/styled-system/css'
import { errorLogs, type ErrorLogDoc } from '@/lib/db/collections'
import { getSuperAdminSession } from '@/lib/auth/super-admin'
import { fmtDateTime } from '@/lib/date/tz'
import { pageHref, paginate, parsePage } from '@/lib/pagination'
import Pagination from '../../_components/Pagination'
import ResolveButton from './_components/ResolveButton'
import { mutedCss } from '@/app/(dashboard)/_lib/styles'

const tabCss = (active: boolean) =>
  css({
    px: '3',
    py: '1.5',
    borderRadius: 'full',
    fontSize: 'sm',
    fontWeight: 'medium',
    border: '1px solid',
    textDecoration: 'none',
    bg: active ? 'blue.600' : 'white',
    color: active ? 'white' : 'gray.600',
    borderColor: active ? 'blue.600' : 'gray.300',
    _dark: { bg: active ? 'blue.600' : 'gray.900', color: active ? 'white' : 'gray.400', borderColor: active ? 'blue.600' : 'gray.700' },
  })

/** Erros do sistema — de TODOS os condomínios. Só super admin (role `superadmin`). */
export default async function AdminErrorsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  if (!(await getSuperAdminSession())) notFound()

  const { status, page: pageParam } = await searchParams
  const showResolved = status === 'resolved'
  const col = await errorLogs()
  // Tela de plataforma: de propósito NÃO filtra por condomínio
  const filter: Filter<ErrorLogDoc> = { resolved_at: { $exists: showResolved } }

  const [openCount, resolvedCount] = await Promise.all([
    col.countDocuments({ resolved_at: { $exists: false } }),
    col.countDocuments({ resolved_at: { $exists: true } }),
  ])
  const pagination = paginate(showResolved ? resolvedCount : openCount, parsePage(pageParam))
  const docs = await col.find(filter).sort({ last_at: -1 }).skip(pagination.skip).limit(pagination.pageSize).toArray()

  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '6' })}>
      <div>
        <h1 className={css({ fontSize: '2xl', fontWeight: 'bold', color: 'gray.900', _dark: { color: 'gray.50' } })}>
          Erros do sistema
        </h1>
        <p className={mutedCss}>
          Falhas do servidor e das telas, de todos os condomínios. O mesmo erro aparece uma vez, com contador; some sozinho 90
          dias depois da última ocorrência. Dados pessoais são mascarados antes de gravar.
        </p>
      </div>

      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '2' })}>
        <Link href="/admin/errors" className={tabCss(!showResolved)}>Em aberto ({openCount})</Link>
        <Link href={pageHref('/admin/errors', { status: 'resolved' }, 1)} className={tabCss(showResolved)}>
          Resolvidos ({resolvedCount})
        </Link>
      </div>

      {docs.length === 0 ? (
        <p className={mutedCss}>{showResolved ? 'Nenhum erro resolvido.' : 'Nenhum erro em aberto.'}</p>
      ) : (
        <div className={css({ display: 'flex', flexDir: 'column', gap: '3' })}>
          {docs.map((doc) => (
            <article
              key={doc._id.toString()}
              className={css({
                bg: 'white',
                border: '1px solid',
                borderColor: 'gray.200',
                borderRadius: 'lg',
                p: { base: '4', md: '5' },
                display: 'flex',
                flexDir: 'column',
                gap: '3',
                _dark: { bg: 'gray.900', borderColor: 'gray.700' },
              })}
            >
              <div className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '3' })}>
                <div className={css({ display: 'flex', flexDir: 'column', gap: '1', minW: '0', flex: 1 })}>
                  <span className={css({ fontFamily: 'mono', fontSize: 'sm', fontWeight: 'semibold', color: 'blue.600', _dark: { color: 'blue.400' } })}>
                    {doc.label}
                  </span>
                  <span className={css({ fontSize: 'sm', color: 'gray.900', wordBreak: 'break-word', _dark: { color: 'gray.100' } })}>
                    <strong>{doc.name}:</strong> {doc.message}
                  </span>
                </div>
                <div className={css({ display: 'flex', alignItems: 'center', gap: '3' })}>
                  <span
                    title="Ocorrências"
                    className={css({ fontSize: 'sm', fontWeight: 'bold', px: '2.5', py: '1', borderRadius: 'full', bg: 'gray.100', color: 'gray.800', _dark: { bg: 'gray.800', color: 'gray.100' } })}
                  >
                    {doc.count.toLocaleString('pt-BR')}×
                  </span>
                  <ResolveButton id={doc._id.toString()} resolved={!!doc.resolved_at} />
                </div>
              </div>

              <p className={css({ fontSize: 'xs', color: 'gray.500', _dark: { color: 'gray.400' } })}>
                Última: {fmtDateTime(doc.last_at)} · Primeira: {fmtDateTime(doc.first_at)} · Ambiente: {doc.env}
                {doc.resolved_at ? ` · Resolvido em ${fmtDateTime(doc.resolved_at)}` : ''}
              </p>

              {(doc.stack || (doc.extra && Object.keys(doc.extra).length > 0)) && (
                <details>
                  <summary className={css({ fontSize: 'xs', color: 'blue.600', cursor: 'pointer', _dark: { color: 'blue.400' } })}>
                    Detalhes técnicos
                  </summary>
                  <pre
                    className={css({
                      mt: '2',
                      p: '3',
                      fontSize: 'xs',
                      fontFamily: 'mono',
                      bg: 'gray.50',
                      borderRadius: 'md',
                      overflowX: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      color: 'gray.700',
                      _dark: { bg: 'gray.950', color: 'gray.300' },
                    })}
                  >
                    {Object.entries(doc.extra ?? {})
                      .map(([key, value]) => `${key}: ${value}`)
                      .concat(doc.stack ? ['', doc.stack] : [])
                      .join('\n')}
                  </pre>
                </details>
              )}
            </article>
          ))}
        </div>
      )}

      <Pagination pathname="/admin/errors" params={{ status }} pagination={pagination} />
    </div>
  )
}
