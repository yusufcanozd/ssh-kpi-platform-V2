import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    // tsconfig'deki "@/*" -> "./*" alias'ını test ortamında da çöz.
    alias: { '@': resolve(process.cwd()) },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
    passWithNoTests: false,
  },
})
