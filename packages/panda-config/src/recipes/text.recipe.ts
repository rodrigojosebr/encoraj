import { defineRecipe } from '@pandacss/dev'

export const textRecipe = defineRecipe({
  className: 'text',
  base: {
    fontFamily: 'sans',
    margin: '0',
  },
  variants: {
    variant: {
      heading: {
        fontSize: '3xl',
        fontWeight: 'bold',
        lineHeight: 'tight',
        color: 'gray.900',
      },
      subheading: {
        fontSize: 'xl',
        fontWeight: 'semibold',
        lineHeight: 'snug',
        color: 'gray.800',
      },
      body: {
        fontSize: 'base',
        fontWeight: 'normal',
        lineHeight: 'normal',
        color: 'gray.700',
      },
      label: {
        fontSize: 'sm',
        fontWeight: 'medium',
        lineHeight: 'normal',
        color: 'gray.700',
      },
      caption: {
        fontSize: 'xs',
        fontWeight: 'normal',
        lineHeight: 'normal',
        color: 'gray.500',
      },
    },
  },
  defaultVariants: {
    variant: 'body',
  },
})
