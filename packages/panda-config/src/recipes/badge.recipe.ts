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
        _dark: { bg: 'blue.950', color: 'blue.300' },
      },
      notified: {
        bg: 'yellow.100',
        color: 'yellow.800',
        _dark: { bg: 'yellow.950', color: 'yellow.300' },
      },
      delivered: {
        bg: 'green.100',
        color: 'green.700',
        _dark: { bg: 'green.950', color: 'green.400' },
      },
      neutral: {
        bg: 'gray.100',
        color: 'gray.700',
        _dark: { bg: 'gray.800', color: 'gray.300' },
      },
    },
  },
  defaultVariants: {
    status: 'neutral',
  },
})
