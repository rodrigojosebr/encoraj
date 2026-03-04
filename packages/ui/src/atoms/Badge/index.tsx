import React from 'react'
import { badge } from '@encoraj/styled-system/recipes'
import type { BadgeVariantProps } from '@encoraj/styled-system/recipes'

export interface BadgeProps
  extends BadgeVariantProps,
    Omit<React.HTMLAttributes<HTMLSpanElement>, keyof BadgeVariantProps> {}

export function Badge({ status, className, children, ...props }: BadgeProps) {
  const classes = badge({ status })

  return (
    <span className={[classes, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </span>
  )
}
