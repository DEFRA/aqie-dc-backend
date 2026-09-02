import { existsSync } from 'node:fs'
import { afterAll, beforeAll } from 'vitest'
import { setup, teardown } from 'vitest-mongodb'

// Keep in step with the mongo image in compose.yml.
// Pinned rather than 'latest' so the version cannot drift between runs.
const MONGO_VERSION = '7.0.24'

// Use a locally cached binary when one is present, so the test run does not
// need to reach fastdl.mongodb.org. Falls back to downloading when absent.
const cachedBinary = `${process.env.HOME}/.cache/mongodb-binaries/mongod-arm64-darwin-${MONGO_VERSION}`

if (existsSync(cachedBinary)) {
  process.env.MONGOMS_SYSTEM_BINARY ??= cachedBinary
}

beforeAll(async () => {
  await setup({
    binary: { version: MONGO_VERSION },
    serverOptions: {}
  })
  process.env.MONGO_URI = globalThis.__MONGO_URI__
})

afterAll(async () => {
  await teardown()
})
