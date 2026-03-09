import { css } from '@/styled-system/css'
import { SkeletonStatCards, SkeletonTable } from './_components/PageSkeleton'

export default function DashboardLoading() {
  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '6' })}>
      <SkeletonStatCards />
      <SkeletonTable rows={5} cols={5} />
    </div>
  )
}
