import { afterAll, beforeAll } from 'vitest'
import { setup, teardown } from 'vitest-mongodb'

beforeAll(async () => {
  // Setup mongo mock
  await setup({
    binary: {
      version: 'latest'
    },
    serverOptions: {}
  })
  process.env.MONGO_URI = globalThis.__MONGO_URI__
})

afterAll(async () => {
  await teardown()
})
