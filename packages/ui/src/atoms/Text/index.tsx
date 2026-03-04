import React from 'react'
import { text } from '@encoraj/styled-system/recipes'

type TextVariant = 'heading' | 'subheading' | 'body' | 'label' | 'caption'

const variantTagMap: Record<TextVariant, keyof React.JSX.IntrinsicElements> = {
  heading: 'h1',
  subheading: 'h2',
  body: 'p',
  label: 'span',
  caption: 'span',
}

export interface TextProps extends Omit<React.HTMLAttributes<HTMLElement>, 'color'> {
  variant?: TextVariant
  as?: keyof React.JSX.IntrinsicElements
}

export function Text({ variant = 'body', as, className, children, ...props }: TextProps) {
  const Tag = (as ?? variantTagMap[variant]) as React.ElementType
  const classes = text({ variant })

  return (
    <Tag className={[classes, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </Tag>
  )
}
