import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      ogql: resolve('./src/')
    }
  },
  test: {
    setupFiles: ['./test/setup.ts']
  }
})
