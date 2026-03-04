import { defineConfig } from '@pandacss/dev'
import { encorajPreset } from '@encoraj/panda-config'

export default defineConfig({
  presets: ['@pandacss/dev/presets', encorajPreset],
  preflight: true,
  include: [
    './app/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  exclude: [],
  outdir: 'styled-system',
})
