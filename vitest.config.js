import { defineConfig, configDefaults } from 'vitest/config'

const shared = {
  globals: true,
  environment: 'node',
  clearMocks: true,
  fileParallelism: false
}

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.js'],
      exclude: [...configDefaults.exclude, 'coverage']
    },
    projects: [
      {
        test: {
          ...shared,
          name: 'unit',
          include: ['src/**/*.test.js'], // Default excludes must be kept - setting exclude replaces them
          exclude: [...configDefaults.exclude, 'src/**/*.integration.test.js'],
          setupFiles: ['.vite/setup-files.js']
        }
      },
      {
        test: {
          ...shared,
          name: 'integration',
          include: ['src/**/*.integration.test.js'],
          setupFiles: ['.vite/mongo-memory-server.js', '.vite/setup-files.js']
        }
      }
    ]
  }
})
