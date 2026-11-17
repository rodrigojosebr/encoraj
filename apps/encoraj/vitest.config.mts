import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)).replace(/\/$/, '') },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/helpers/global-setup.ts'],
    setupFiles: ['tests/helpers/setup.ts'],
    testTimeout: 20_000,
    hookTimeout: 120_000, // primeira execução baixa o binário do MongoDB
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.ts', 'app/api/**/*.ts', 'middleware.ts'],
      reporter: ['text', 'html'],
      // Piso de cobertura. Só sobe: não pode cair sem alguém mexer aqui de propósito.
      // Medido em 17/nov/2026: 100% linhas, 99,8% statements, 97,5% branches, 98,9% funções.
      thresholds: { lines: 100, statements: 99, branches: 96, functions: 98 },
    },
  },
})
