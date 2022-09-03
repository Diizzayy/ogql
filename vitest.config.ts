import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      ohmygql: resolve('./src/')
    }
  },
  test: {
    setupFiles: ['./test/setup.ts']
  }
})
