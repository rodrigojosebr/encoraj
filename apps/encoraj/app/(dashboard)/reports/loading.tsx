import { css } from '@/styled-system/css'
import { SkeletonHeader, SkeletonStatCards, SkeletonFilterBar, SkeletonTable } from '../_components/PageSkeleton'

export default function ReportsLoading() {
  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '6' })}>
      <SkeletonHeader hasButton={false} />
      <SkeletonStatCards />
      <SkeletonFilterBar />
      <SkeletonTable rows={8} cols={6} />
    </div>
  )
}
