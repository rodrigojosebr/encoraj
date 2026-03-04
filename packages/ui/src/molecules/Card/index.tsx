import React from 'react'
import { css, cx } from '@encoraj/styled-system/css'

type CardVariant = 'flat' | 'elevated' | 'outlined'

const variantStyles: Record<CardVariant, string> = {
  flat: css({ bg: 'gray.50', borderRadius: 'lg' }),
  elevated: css({ bg: 'white', borderRadius: 'lg', boxShadow: 'md' }),
  outlined: css({ bg: 'white', borderRadius: 'lg', border: '1px solid', borderColor: 'gray.200' }),
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
}

export function Card({ variant = 'outlined', className, children, ...props }: CardProps) {
  return (
    <div className={cx(variantStyles[variant], css({ padding: '6' }), className)} {...props}>
      {children}
    </div>
  )
}
