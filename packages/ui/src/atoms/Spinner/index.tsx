'use client'

import React from 'react'
import { css } from '@encoraj/styled-system/css'

type SpinnerSize = 'sm' | 'md' | 'lg'

const sizeMap: Record<SpinnerSize, string> = {
  sm: '16px',
  md: '24px',
  lg: '32px',
}

export interface SpinnerProps {
  size?: SpinnerSize
  label?: string
}

export function Spinner({ size = 'md', label = 'Carregando...' }: SpinnerProps) {
  const dimension = sizeMap[size]

  return (
    <span
      role="status"
      aria-label={label}
      className={css({
        display: 'inline-block',
        width: dimension,
        height: dimension,
        borderRadius: 'full',
        border: '2px solid',
        borderColor: 'currentColor',
        borderTopColor: 'transparent',
        animation: 'spin 0.6s linear infinite',
        flexShrink: 0,
      })}
    />
  )
}
