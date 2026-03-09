import { css } from '@/styled-system/css'

const pulse = css({
  animation: 'skeleton-pulse 1.6s ease-in-out infinite',
  bg: 'gray.200',
  borderRadius: 'md',
  _dark: { bg: 'gray.700' },
})

function Bar({ w = '100%', h = '4' }: { w?: string; h?: string }) {
  return (
    <div
      className={pulse}
      style={{ width: w, height: `var(--spacing-${h}, ${h})` }}
    />
  )
}

export function SkeletonHeader({ hasButton = true }: { hasButton?: boolean }) {
  return (
    <div className={css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '3' })}>
      <Bar w="160px" h="8" />
      {hasButton && <Bar w="120px" h="9" />}
    </div>
  )
}

export function SkeletonStatCards() {
  return (
    <div className={css({ display: 'grid', gridTemplateColumns: { base: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: '4' })}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={css({ p: '5', borderRadius: 'xl', border: '1px solid token(colors.gray.200)', _dark: { border: '1px solid token(colors.gray.700)' }, display: 'flex', flexDir: 'column', gap: '2' })}>
          <Bar w="60%" h="4" />
          <Bar w="40%" h="8" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  const widths = ['40%', '60%', '30%', '25%', '50%', '35%']
  return (
    <div className={css({ overflowX: 'auto', borderRadius: 'xl', border: '1px solid token(colors.gray.200)', _dark: { border: '1px solid token(colors.gray.700)' } })}>
      <table className={css({ w: 'full', minW: '600px', borderCollapse: 'collapse' })}>
        <thead>
          <tr className={css({ bg: 'gray.50', _dark: { bg: 'gray.800' } })}>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className={css({ px: '4', py: '3' })}>
                <Bar w={widths[i % widths.length]} h="3" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className={css({ borderTop: '1px solid token(colors.gray.100)', _dark: { borderTop: '1px solid token(colors.gray.800)' } })}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className={css({ px: '4', py: '3' })}>
                  <Bar w={widths[(r + c) % widths.length]} h="4" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '3' })}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={css({ p: '4', borderRadius: 'xl', border: '1px solid token(colors.gray.200)', _dark: { border: '1px solid token(colors.gray.700)' }, display: 'flex', flexDir: 'column', gap: '2' })}>
          <Bar w="55%" h="4" />
          <Bar w="35%" h="3" />
          <Bar w="45%" h="3" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonFilterBar() {
  return (
    <div className={css({ display: 'flex', gap: '2', flexWrap: 'wrap' })}>
      {Array.from({ length: 4 }).map((_, i) => (
        <Bar key={i} w="80px" h="8" />
      ))}
    </div>
  )
}
