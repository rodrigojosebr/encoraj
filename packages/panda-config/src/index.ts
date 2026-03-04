import { definePreset } from '@pandacss/dev'
import { colors, typography, spacing } from './tokens'
import { buttonRecipe, badgeRecipe, textRecipe, inputRecipe } from './recipes'

export const encorajPreset = definePreset({
  name: 'encoraj',
  theme: {
    extend: {
      tokens: {
        colors,
        fontSizes: typography.sizes,
        fontWeights: typography.weights,
        lineHeights: typography.lineHeights,
        fonts: typography.fonts,
        spacing,
      },
      recipes: {
        badge: badgeRecipe,
        text: textRecipe,
      },
      slotRecipes: {
        button: buttonRecipe,
        input: inputRecipe,
      },
    },
  },
})
