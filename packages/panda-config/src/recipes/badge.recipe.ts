import { defineRecipe } from '@pandacss/dev'

export const badgeRecipe = defineRecipe({
  className: 'badge',
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: 'full',
    fontFamily: 'sans',
    fontWeight: 'medium',
    fontSize: 'xs',
    paddingX: '2.5',
    paddingY: '0.5',
    whiteSpace: 'nowrap',
  },
  variants: {
    status: {
      arrived: {
        bg: 'blue.100',
        color: 'blue.800',
      },
      notified: {
        bg: 'yellow.100',
        color: 'yellow.800',
      },
      delivered: {
        bg: 'green.100',
        color: 'green.700',
      },
      neutral: {
        bg: 'gray.100',
        color: 'gray.700',
      },
    },
  },
  defaultVariants: {
    status: 'neutral',
  },
})
