import { css } from '@/styled-system/css'
import { SkeletonHeader, SkeletonTable, SkeletonCards } from '../_components/PageSkeleton'

export default function UsersLoading() {
  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '6' })}>
      <SkeletonHeader />
      {/* mobile */}
      <div className={css({ display: { base: 'flex', md: 'none' }, flexDir: 'column', gap: '3' })}>
        <SkeletonCards count={4} />
      </div>
      {/* desktop */}
      <div className={css({ display: { base: 'none', md: 'block' } })}>
        <SkeletonTable rows={6} cols={4} />
      </div>
    </div>
  )
}
