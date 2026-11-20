import { notFound } from 'next/navigation'
import { css } from '@/styled-system/css'
import { getSuperAdminSession } from '@/lib/auth/super-admin'
import { fmtDate } from '@/lib/date/tz'
import { APP_VERSION, CHANGE_TYPE_LABELS, RELEASES, currentDeploy, type ChangeType } from '@/lib/releases/history'
import { cardCss, h1Css, labelCss, mutedCss, valueCss } from '@/app/(dashboard)/_lib/styles'

const TYPE_CSS: Record<ChangeType, string> = {
  feature: css({ bg: 'blue.50', color: 'blue.700', _dark: { bg: 'blue.950', color: 'blue.300' } }),
  fix: css({ bg: 'green.50', color: 'green.700', _dark: { bg: 'green.950', color: 'green.300' } }),
  security: css({ bg: 'red.50', color: 'red.700', _dark: { bg: 'red.950', color: 'red.300' } }),
  improvement: css({ bg: 'purple.50', color: 'purple.700', _dark: { bg: 'purple.950', color: 'purple.300' } }),
  infra: css({ bg: 'gray.100', color: 'gray.700', _dark: { bg: 'gray.800', color: 'gray.300' } }),
}
const chipCss = css({ flexShrink: 0, px: '2', py: '0.5', borderRadius: 'full', fontSize: 'xs', fontWeight: 'semibold', whiteSpace: 'nowrap' })
const monoCss = css({ fontFamily: 'mono', fontSize: 'xs', color: 'gray.500', _dark: { color: 'gray.400' } })

/**
 * Releases: como o app chegou até aqui. Só super admin. O histórico vem de
 * lib/releases/history.ts (atualizado a cada mudança média ou grande) e o "no ar agora",
 * das variáveis de sistema da Vercel.
 */
export default async function AdminReleasesPage() {
  if (!(await getSuperAdminSession())) notFound()

  const deploy = currentDeploy()

  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '6', maxW: '820px' })}>
      <div>
        <h1 className={h1Css}>Releases</h1>
        <p className={mutedCss}>Como o encoraj chegou até aqui. Toda mudança média ou grande ganha uma entrada nova no topo.</p>
      </div>

      {/* No ar agora */}
      <section className={cardCss}>
        <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: '4' })}>
          <div>
            <p className={labelCss}>Versão</p>
            <p className={css({ fontSize: 'xl', fontWeight: 'bold', color: 'gray.900', _dark: { color: 'gray.50' } })}>{APP_VERSION}</p>
          </div>
          <div>
            <p className={labelCss}>Ambiente</p>
            <p className={valueCss}>{deploy.env}</p>
          </div>
          <div>
            <p className={labelCss}>Commit no ar</p>
            <p className={css({ fontFamily: 'mono', fontSize: 'sm', color: 'gray.900', _dark: { color: 'gray.100' } })}>{deploy.commit ?? '—'}</p>
          </div>
          <div>
            <p className={labelCss}>Branch</p>
            <p className={valueCss}>{deploy.branch ?? '—'}</p>
          </div>
        </div>
        {deploy.message && <p className={mutedCss}>Último commit: {deploy.message}</p>}
      </section>

      {/* Histórico */}
      <ol className={css({ listStyle: 'none', p: '0', m: '0', display: 'flex', flexDir: 'column', gap: '4' })}>
        {RELEASES.map((release, i) => (
          <li key={release.version} className={cardCss}>
            <div className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '2' })}>
              <span
                className={css({
                  fontFamily: 'mono', fontSize: 'sm', fontWeight: 'bold', px: '2', py: '0.5', borderRadius: 'md',
                  bg: 'gray.100', color: 'gray.800', _dark: { bg: 'gray.800', color: 'gray.100' },
                })}
              >
                v{release.version}
              </span>
              <h2 className={css({ fontSize: 'lg', fontWeight: 'semibold', color: 'gray.900', _dark: { color: 'gray.50' } })}>{release.title}</h2>
              {i === 0 && (
                <span className={css({ fontSize: 'xs', fontWeight: 'semibold', color: 'blue.600', _dark: { color: 'blue.400' } })}>mais recente</span>
              )}
              <span className={css({ ml: 'auto', fontSize: 'sm', color: 'gray.500', _dark: { color: 'gray.400' } })}>
                {fmtDate(`${release.date}T12:00:00Z`)}
              </span>
            </div>

            <p className={css({ fontSize: 'sm', color: 'gray.700', _dark: { color: 'gray.300' } })}>{release.summary}</p>

            <ul className={css({ listStyle: 'none', p: '0', m: '0', display: 'flex', flexDir: 'column', gap: '2' })}>
              {release.changes.map((change) => (
                <li key={change.text} className={css({ display: 'flex', alignItems: 'flex-start', gap: '2' })}>
                  <span className={`${chipCss} ${TYPE_CSS[change.type]}`}>{CHANGE_TYPE_LABELS[change.type]}</span>
                  <span className={css({ fontSize: 'sm', color: 'gray.800', _dark: { color: 'gray.200' } })}>{change.text}</span>
                </li>
              ))}
            </ul>

            {release.commits && release.commits.length > 0 && (
              <p className={monoCss}>commits: {release.commits.join(' · ')}</p>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
