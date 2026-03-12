import { defineRecipe } from '@pandacss/dev'

export const badgeRecipe = defineRecipe({
  className: 'badge',
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: 'full',
    fontFamily: 'sans',
    fontWeight: 'semibold',
    fontSize: 'xs',
    paddingX: '2.5',
    paddingY: '0.5',
    border: '1px solid transparent',
    whiteSpace: 'nowrap',
  },
  variants: {
    status: {
      arrived: {
        bg: 'blue.100',
        color: 'blue.700',
        borderColor: 'blue.200',
        _dark: { bg: 'blue.900/60', color: 'blue.300', borderColor: 'blue.700' },
      },
      notified: {
        bg: 'amber.100',
        color: 'amber.700',
        borderColor: 'amber.200',
        _dark: { bg: 'amber.900/60', color: 'amber.300', borderColor: 'amber.700' },
      },
      delivered: {
        bg: 'green.100',
        color: 'green.700',
        borderColor: 'green.200',
        _dark: { bg: 'green.900/60', color: 'green.400', borderColor: 'green.700' },
      },
      neutral: {
        bg: 'gray.100',
        color: 'gray.600',
        borderColor: 'gray.200',
        _dark: { bg: 'gray.800', color: 'gray.400', borderColor: 'gray.700' },
      },
    },
  },
  defaultVariants: {
    status: 'neutral',
  },
})
