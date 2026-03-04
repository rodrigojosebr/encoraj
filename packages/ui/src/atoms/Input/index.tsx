'use client'

import React from 'react'
import { input } from '@encoraj/styled-system/recipes'
import type { InputVariantProps } from '@encoraj/styled-system/recipes'

export interface InputProps
  extends Omit<InputVariantProps, 'error'>,
    Omit<React.ComponentPropsWithoutRef<'input'>, 'size'> {
  error?: boolean
}

export function Input({ size, error, className, ...props }: InputProps) {
  const classes = input({ size, error })

  return (
    <input
      className={[classes.input, className].filter(Boolean).join(' ')}
      aria-invalid={error ?? undefined}
      {...props}
    />
  )
}
