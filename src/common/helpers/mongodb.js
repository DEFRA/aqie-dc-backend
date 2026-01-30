import { MongoClient } from 'mongodb'
import { LockManager } from 'mongo-locks'
import { setupAppliancesAndFuels } from '../../migrations/setup-appliances-fuels.js'
import { setupUsersAndRelationships } from '../../migrations/setup-users-relationships.js'

export const mongoDb = {
  plugin: {
    name: 'mongodb',
    version: '1.0.0',
    register: async function (server, options) {
      server.logger.info('Setting up MongoDb')

      const client = await MongoClient.connect(options.mongoUrl, {
        ...options.mongoOptions
      })

      const databaseName = options.databaseName
      const db = client.db(databaseName)
      const locker = new LockManager(db.collection('mongo-locks'))

      await createIndexes(db, server.logger)

      server.logger.info(`MongoDb connected to ${databaseName}`)

      server.decorate('server', 'mongoClient', client)
      server.decorate('server', 'db', db)
      server.decorate('server', 'locker', locker)
      server.decorate('request', 'db', () => db, { apply: true })
      server.decorate('request', 'locker', () => locker, { apply: true })

      server.events.on('stop', async () => {
        server.logger.info('Closing Mongo client')
        try {
          await client.close(true)
        } catch (e) {
          server.logger.error(e, 'failed to close mongo client')
        }
      })
    }
  }
}

async function createIndexes(db, logger) {
  await db.collection('mongo-locks').createIndex({ id: 1 })

  // Example of how to create a mongodb index. Remove as required
  await db.collection('example-data').createIndex({ id: 1 })

  // Setup Appliances and Fuels collections if they don't exist
  await ensureAppliancesAndFuelsCollections(db, logger)
}

async function ensureAppliancesAndFuelsCollections(db, logger) {
  try {
    const collections = await db.listCollections().toArray()
    const collectionNames = collections.map((c) => c.name)

    const hasAppliances = collectionNames.includes('Appliances')
    const hasFuels = collectionNames.includes('Fuels')
    const hasUsers = collectionNames.includes('Users')
    const hasUserAppliances = collectionNames.includes('UserAppliances')
    const hasUserFuels = collectionNames.includes('UserFuels')

    // Setup Appliances and Fuels
    if (!hasAppliances || !hasFuels) {
      logger.info('Setting up Appliances and Fuels collections...')
      await setupAppliancesAndFuels(db, {
        dropExisting: false,
        insertSamples: false
      })
      logger.info('Appliances and Fuels collections setup complete')
    } else {
      logger.info('Appliances and Fuels collections already exist')
    }

    // Setup Users and Relationships
    if (!hasUsers || !hasUserAppliances || !hasUserFuels) {
      logger.info('Setting up Users and Relationships collections...')
      await setupUsersAndRelationships(db, {
        dropExisting: false
      })
      logger.info('Users and Relationships collections setup complete')
    } else {
      logger.info('Users and Relationships collections already exist')
    }
  } catch (error) {
    logger.error(error, 'Failed to setup collections')
    // Don't throw - allow the app to start even if migration fails
  }
}
