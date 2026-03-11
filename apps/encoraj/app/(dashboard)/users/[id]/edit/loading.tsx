import { css } from '@/styled-system/css'
import { SkeletonHeader } from '../../../_components/PageSkeleton'

const pulse = css({
  animation: 'skeleton-pulse 1.6s ease-in-out infinite',
  bg: 'gray.200',
  borderRadius: 'md',
  _dark: { bg: 'gray.700' },
})

function Bar({ w = '100%', h = '4' }: { w?: string; h?: string }) {
  return <div className={pulse} style={{ width: w, height: `var(--spacing-${h}, ${h})` }} />
}

export default function UserEditLoading() {
  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '6', maxW: '480px' })}>
      <SkeletonHeader />
      <div className={css({ bg: 'white', border: '1px solid token(colors.gray.200)', borderRadius: 'lg', p: { base: '4', md: '6' }, display: 'flex', flexDir: 'column', gap: '4', _dark: { bg: 'gray.900', border: '1px solid token(colors.gray.700)' } })}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={css({ display: 'flex', flexDir: 'column', gap: '1.5' })}>
            <Bar w="90px" h="3" />
            <Bar w="100%" h="9" />
          </div>
        ))}
        <div className={css({ display: 'flex', gap: '3' })}>
          <Bar w="120px" h="9" />
          <Bar w="80px" h="9" />
        </div>
      </div>
    </div>
  )
}
