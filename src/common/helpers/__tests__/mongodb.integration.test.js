import { Db, MongoClient } from 'mongodb'
import { LockManager } from 'mongo-locks'

describe('#mongoDb', () => {
  let server

  describe('Set up', () => {
    beforeAll(async () => {
      // Dynamic import needed due to config being updated by vitest-mongodb
      const { createServer } = await import('#src/server.js')

      server = await createServer()
      await server.initialize()
    })

    afterAll(async () => {
      await server.mongoClient.close()
    })

    test('Server should have expected MongoDb decorators', () => {
      expect(server.db).toBeInstanceOf(Db)
      expect(server.mongoClient).toBeInstanceOf(MongoClient)
      expect(server.locker).toBeInstanceOf(LockManager)
    })

    test('MongoDb should have expected database name', () => {
      expect(server.db.databaseName).toBe('aqie-dc-backend')
    })

    test('MongoDb should have expected namespace', () => {
      expect(server.db.namespace).toBe('aqie-dc-backend')
    })
  })

  describe('Shut down', () => {
    beforeAll(async () => {
      // Dynamic import needed due to config being updated by vitest-mongodb
      const { createServer } = await import('#src/server.js')

      server = await createServer()
      await server.initialize()
    })

    test('Should close Mongo client on server stop', async () => {
      const client = server.mongoClient
      const realClose = client.close.bind(client)
      // Stub the forced close: it rejects in-flight driver operations as unhandled
      const closeSpy = vi.spyOn(client, 'close').mockResolvedValue(undefined)
      await server.stop({ timeout: 1000 })

      expect(closeSpy).toHaveBeenCalledWith(true)
      await realClose()
    })
  })
})
