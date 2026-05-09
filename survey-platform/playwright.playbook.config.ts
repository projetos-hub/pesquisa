import { defineConfig } from '@playwright/test'
import dotenv from 'dotenv'
import path   from 'path'
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

export default defineConfig({
  testMatch: '**/playbook-capture.spec.ts',
  fullyParallel: false,
  retries: 0,
  timeout: 300_000,
  use: {
    baseURL: 'https://pesquisa-nu-sand.vercel.app',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
})
