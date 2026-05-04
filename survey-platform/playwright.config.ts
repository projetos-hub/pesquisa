import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '.env.local') })

export default defineConfig({
  testDir:    './tests/e2e',
  fullyParallel: false,
  retries:    1,
  timeout:    30_000,

  use: {
    baseURL:       process.env.BASE_URL ?? 'http://localhost:3000',
    trace:         'on-first-retry',
    screenshot:    'only-on-failure',
    video:         'on-first-retry',
  },

  projects: [
    // Setup: faz login e salva cookie
    {
      name:    'setup',
      testMatch: '**/global-setup.spec.ts',
    },

    // Testes públicos (sem auth) — respondente + sample gate
    {
      name:         'public',
      testMatch:    ['**/respondente.spec.ts', '**/sample-gate.spec.ts'],
    },

    // Testes admin (reutiliza cookie salvo pelo setup)
    {
      name:         'admin',
      testMatch:    ['**/admin-*.spec.ts', '**/cron-*.spec.ts', '**/dispatch-audit.spec.ts', '**/dispatch-execution.spec.ts'],
      dependencies: ['setup'],
      use: {
        storageState: 'tests/.auth/admin.json',
      },
    },
  ],

  // Dev server gerenciado externamente (script PowerShell)
  // webServer removido para evitar conflito de lock
})
