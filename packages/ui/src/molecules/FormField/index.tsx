'use client'

import React, { useId } from 'react'
import { input } from '@encoraj/styled-system/recipes'
import type { InputVariantProps } from '@encoraj/styled-system/recipes'
import { Input } from '../../atoms/Input'

export interface FormFieldProps
  extends Omit<InputVariantProps, 'error'>,
    Omit<React.ComponentPropsWithoutRef<'input'>, 'size'> {
  label: string
  errorMessage?: string
  hint?: string
}

export function FormField({
  label,
  errorMessage,
  hint,
  size,
  id: providedId,
  ...inputProps
}: FormFieldProps) {
  const generatedId = useId()
  const id = providedId ?? generatedId
  const hasError = Boolean(errorMessage)
  const classes = input({ size, error: hasError })

  return (
    <div className={classes.wrapper}>
      <label htmlFor={id} className={classes.label}>
        {label}
      </label>
      <Input id={id} size={size} error={hasError} {...inputProps} />
      {hasError && (
        <span className={classes.errorMessage} role="alert">
          {errorMessage}
        </span>
      )}
      {hint && !hasError && (
        <span className={classes.errorMessage} style={{ color: 'inherit', opacity: 0.6 }}>
          {hint}
        </span>
      )}
    </div>
  )
}
