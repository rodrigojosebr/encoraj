import { css } from '@/styled-system/css'
import { SkeletonHeader } from '../../_components/PageSkeleton'

const pulse = css({
  animation: 'skeleton-pulse 1.6s ease-in-out infinite',
  bg: 'gray.200',
  borderRadius: 'md',
  _dark: { bg: 'gray.700' },
})

function Bar({ w = '100%', h = '4' }: { w?: string; h?: string }) {
  return <div className={pulse} style={{ width: w, height: `var(--spacing-${h}, ${h})` }} />
}

export default function PackageDetailLoading() {
  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '6', maxW: '640px' })}>
      <div className={css({ display: 'flex', alignItems: 'center', gap: '3' })}>
        <Bar w="140px" h="8" />
        <Bar w="80px" h="6" />
      </div>
      <div className={css({ bg: 'white', border: '1px solid token(colors.gray.200)', borderRadius: 'lg', p: { base: '4', md: '6' }, display: 'grid', gridTemplateColumns: { base: '1fr', md: '1fr 1fr' }, gap: '6', _dark: { bg: 'gray.900', border: '1px solid token(colors.gray.700)' } })}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={css({ display: 'flex', flexDir: 'column', gap: '1' })}>
            <Bar w="50%" h="3" />
            <Bar w="75%" h="4" />
          </div>
        ))}
      </div>
      <Bar w="160px" h="10" />
    </div>
  )
}
