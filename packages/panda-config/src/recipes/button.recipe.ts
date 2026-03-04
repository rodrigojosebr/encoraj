import { defineSlotRecipe } from '@pandacss/dev'

export const buttonRecipe = defineSlotRecipe({
  className: 'button',
  slots: ['root', 'leftIcon', 'rightIcon'],
  base: {
    root: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '2',
      fontFamily: 'sans',
      fontWeight: 'medium',
      borderRadius: 'md',
      border: '1px solid transparent',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      textDecoration: 'none',
      whiteSpace: 'nowrap',
      _disabled: {
        opacity: '0.5',
        cursor: 'not-allowed',
        pointerEvents: 'none',
      },
      _focusVisible: {
        outline: '2px solid',
        outlineOffset: '2px',
      },
    },
    leftIcon: {
      display: 'flex',
      alignItems: 'center',
      flexShrink: 0,
    },
    rightIcon: {
      display: 'flex',
      alignItems: 'center',
      flexShrink: 0,
    },
  },
  variants: {
    variant: {
      solid: {},
      outline: {},
      ghost: {},
    },
    intent: {
      primary: {},
      secondary: {},
      danger: {},
    },
    size: {
      sm: {
        root: {
          height: '8',
          paddingX: '3',
          fontSize: 'sm',
          gap: '1.5',
        },
        leftIcon: { width: '4', height: '4' },
        rightIcon: { width: '4', height: '4' },
      },
      md: {
        root: {
          height: '10',
          paddingX: '4',
          fontSize: 'base',
          gap: '2',
        },
        leftIcon: { width: '5', height: '5' },
        rightIcon: { width: '5', height: '5' },
      },
      lg: {
        root: {
          height: '12',
          paddingX: '6',
          fontSize: 'lg',
          gap: '2.5',
        },
        leftIcon: { width: '5', height: '5' },
        rightIcon: { width: '5', height: '5' },
      },
    },
  },
  compoundVariants: [
    // Solid + primary
    {
      variant: 'solid',
      intent: 'primary',
      css: {
        root: {
          bg: 'blue.600',
          color: 'white',
          _hover: { bg: 'blue.700' },
          _active: { bg: 'blue.800' },
          _focusVisible: { outlineColor: 'blue.500' },
        },
      },
    },
    // Solid + secondary
    {
      variant: 'solid',
      intent: 'secondary',
      css: {
        root: {
          bg: 'gray.100',
          color: 'gray.800',
          _hover: { bg: 'gray.200' },
          _active: { bg: 'gray.300' },
          _focusVisible: { outlineColor: 'gray.400' },
        },
      },
    },
    // Solid + danger
    {
      variant: 'solid',
      intent: 'danger',
      css: {
        root: {
          bg: 'red.600',
          color: 'white',
          _hover: { bg: 'red.700' },
          _active: { bg: 'red.800' },
          _focusVisible: { outlineColor: 'red.500' },
        },
      },
    },
    // Outline + primary
    {
      variant: 'outline',
      intent: 'primary',
      css: {
        root: {
          bg: 'transparent',
          borderColor: 'blue.600',
          color: 'blue.600',
          _hover: { bg: 'blue.50' },
          _active: { bg: 'blue.100' },
          _focusVisible: { outlineColor: 'blue.500' },
        },
      },
    },
    // Outline + secondary
    {
      variant: 'outline',
      intent: 'secondary',
      css: {
        root: {
          bg: 'transparent',
          borderColor: 'gray.300',
          color: 'gray.700',
          _hover: { bg: 'gray.50' },
          _active: { bg: 'gray.100' },
          _focusVisible: { outlineColor: 'gray.400' },
        },
      },
    },
    // Outline + danger
    {
      variant: 'outline',
      intent: 'danger',
      css: {
        root: {
          bg: 'transparent',
          borderColor: 'red.600',
          color: 'red.600',
          _hover: { bg: 'red.50' },
          _active: { bg: 'red.100' },
          _focusVisible: { outlineColor: 'red.500' },
        },
      },
    },
    // Ghost + primary
    {
      variant: 'ghost',
      intent: 'primary',
      css: {
        root: {
          bg: 'transparent',
          color: 'blue.600',
          _hover: { bg: 'blue.50' },
          _active: { bg: 'blue.100' },
          _focusVisible: { outlineColor: 'blue.500' },
        },
      },
    },
    // Ghost + secondary
    {
      variant: 'ghost',
      intent: 'secondary',
      css: {
        root: {
          bg: 'transparent',
          color: 'gray.700',
          _hover: { bg: 'gray.100' },
          _active: { bg: 'gray.200' },
          _focusVisible: { outlineColor: 'gray.400' },
        },
      },
    },
    // Ghost + danger
    {
      variant: 'ghost',
      intent: 'danger',
      css: {
        root: {
          bg: 'transparent',
          color: 'red.600',
          _hover: { bg: 'red.50' },
          _active: { bg: 'red.100' },
          _focusVisible: { outlineColor: 'red.500' },
        },
      },
    },
  ],
  defaultVariants: {
    variant: 'solid',
    intent: 'primary',
    size: 'md',
  },
})
