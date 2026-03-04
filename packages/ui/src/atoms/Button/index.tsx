'use client'

import React from 'react'
import { button } from '@encoraj/styled-system/recipes'
import type { ButtonVariantProps } from '@encoraj/styled-system/recipes'
import { Spinner } from '../Spinner'

export interface ButtonProps
  extends ButtonVariantProps,
    Omit<React.ComponentPropsWithoutRef<'button'>, keyof ButtonVariantProps> {
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export function Button({
  variant,
  intent,
  size,
  loading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const classes = button({ variant, intent, size })

  return (
    <button
      className={[classes.root, className].filter(Boolean).join(' ')}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? (
        <Spinner size="sm" />
      ) : (
        <>
          {leftIcon && <span className={classes.leftIcon}>{leftIcon}</span>}
          {children}
          {rightIcon && <span className={classes.rightIcon}>{rightIcon}</span>}
        </>
      )}
    </button>
  )
}
