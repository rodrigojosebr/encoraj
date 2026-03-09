import { css } from '@/styled-system/css'
import { SkeletonHeader, SkeletonFilterBar, SkeletonTable, SkeletonCards } from '../_components/PageSkeleton'

export default function ResidentsLoading() {
  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '6' })}>
      <SkeletonHeader />
      <SkeletonFilterBar />
      {/* mobile */}
      <div className={css({ display: { base: 'flex', md: 'none' }, flexDir: 'column', gap: '3' })}>
        <SkeletonCards count={5} />
      </div>
      {/* desktop */}
      <div className={css({ display: { base: 'none', md: 'block' } })}>
        <SkeletonTable rows={8} cols={5} />
      </div>
    </div>
  )
}
