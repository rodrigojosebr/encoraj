'use client'

import React, { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { css } from '@encoraj/styled-system/css'
import { input } from '@encoraj/styled-system/recipes'
import { Input } from '../../atoms/Input'
import type { FormFieldProps } from '../FormField'

export type PasswordFieldProps = Omit<FormFieldProps, 'type'>

/** Campo de senha com rótulo e botão de mostrar/ocultar. Mesmo visual do FormField. */
export function PasswordField({
  label,
  errorMessage,
  hint,
  size,
  id: providedId,
  placeholder = '••••••••',
  ...inputProps
}: PasswordFieldProps) {
  const generatedId = useId()
  const id = providedId ?? generatedId
  const [show, setShow] = useState(false)
  const hasError = Boolean(errorMessage)
  const classes = input({ size, error: hasError })

  return (
    <div className={classes.wrapper}>
      <label htmlFor={id} className={classes.label}>
        {label}
      </label>
      <div className={css({ position: 'relative' })}>
        <Input
          id={id}
          size={size}
          error={hasError}
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          className={css({ pr: '10' })}
          {...inputProps}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
          className={css({
            position: 'absolute',
            right: '3',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            color: 'gray.400',
            bg: 'transparent',
            border: 'none',
            p: '0',
            cursor: 'pointer',
            _hover: { color: 'gray.600' },
            _dark: { _hover: { color: 'gray.300' } },
          })}
        >
          {show ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
        </button>
      </div>
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
