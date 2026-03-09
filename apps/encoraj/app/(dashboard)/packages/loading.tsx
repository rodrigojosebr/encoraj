import { css } from '@/styled-system/css'
import { SkeletonHeader, SkeletonFilterBar, SkeletonTable } from '../_components/PageSkeleton'

export default function PackagesLoading() {
  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '6' })}>
      <SkeletonHeader hasButton={false} />
      <SkeletonFilterBar />
      <SkeletonTable rows={8} cols={5} />
    </div>
  )
}
