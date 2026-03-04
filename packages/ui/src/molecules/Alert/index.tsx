import React from 'react'
import { css, cx } from '@encoraj/styled-system/css'

type AlertVariant = 'success' | 'error' | 'warning' | 'info'

const variantStyles: Record<AlertVariant, string> = {
  success: css({ bg: 'green.50', border: '1px solid', borderColor: 'green.500', color: 'green.700', borderRadius: 'md', padding: '4' }),
  error:   css({ bg: 'red.50',   border: '1px solid', borderColor: 'red.500',   color: 'red.700',   borderRadius: 'md', padding: '4' }),
  warning: css({ bg: 'yellow.50',border: '1px solid', borderColor: 'yellow.500',color: 'yellow.700',borderRadius: 'md', padding: '4' }),
  info:    css({ bg: 'blue.50',  border: '1px solid', borderColor: 'blue.500',  color: 'blue.700',  borderRadius: 'md', padding: '4' }),
}

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant
  title?: string
}

export function Alert({ variant = 'info', title, className, children, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cx(
        variantStyles[variant],
        css({ display: 'flex', flexDirection: 'column', gap: '1', fontFamily: 'sans', fontSize: 'sm' }),
        className,
      )}
      {...props}
    >
      {title && (
        <strong className={css({ fontWeight: 'semibold', fontSize: 'base' })}>{title}</strong>
      )}
      {children}
    </div>
  )
}
