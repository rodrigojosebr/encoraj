import { defineSlotRecipe } from '@pandacss/dev'

export const inputRecipe = defineSlotRecipe({
  className: 'input',
  slots: ['wrapper', 'label', 'input', 'errorMessage'],
  base: {
    wrapper: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1',
    },
    label: {
      fontFamily: 'sans',
      fontSize: 'sm',
      fontWeight: 'medium',
      color: 'gray.700',
      _dark: { color: 'gray.300' },
    },
    input: {
      width: '100%',
      fontFamily: 'sans',
      borderRadius: 'md',
      border: '1px solid',
      borderColor: 'gray.300',
      bg: 'white',
      color: 'gray.900',
      transition: 'all 0.15s ease',
      outline: 'none',
      _placeholder: { color: 'gray.400' },
      _focus: {
        borderColor: 'blue.500',
        boxShadow: '0 0 0 3px token(colors.blue.100)',
      },
      _disabled: {
        bg: 'gray.50',
        color: 'gray.400',
        cursor: 'not-allowed',
        borderColor: 'gray.200',
      },
      _dark: {
        bg: 'gray.800',
        borderColor: 'gray.600',
        color: 'gray.100',
        _placeholder: { color: 'gray.500' },
        _focus: {
          borderColor: 'blue.400',
          boxShadow: '0 0 0 3px token(colors.blue.900)',
        },
        _disabled: {
          bg: 'gray.900',
          color: 'gray.500',
          borderColor: 'gray.700',
        },
      },
    },
    errorMessage: {
      fontFamily: 'sans',
      fontSize: 'xs',
      color: 'red.600',
    },
  },
  variants: {
    size: {
      sm: {
        input: {
          height: '8',
          paddingX: '3',
          fontSize: 'sm',
        },
      },
      md: {
        input: {
          height: '10',
          paddingX: '4',
          fontSize: 'base',
        },
      },
      lg: {
        input: {
          height: '12',
          paddingX: '4',
          fontSize: 'lg',
        },
      },
    },
    error: {
      true: {
        input: {
          borderColor: 'red.500',
          _focus: {
            borderColor: 'red.500',
            boxShadow: '0 0 0 3px token(colors.red.100)',
          },
        },
      },
    },
  },
  defaultVariants: {
    size: 'md',
    error: false,
  },
})
