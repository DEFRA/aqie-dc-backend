import { MongoClient } from 'mongodb'
import { LockManager } from 'mongo-locks'
import { performS3DataImport } from '../../routes/s3-import.js'
import { setupApplications } from './db/setup-applications.js'
import { config } from '../../config.js'

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

  //
}

async function ensureAppliancesAndFuelsCollections(db, logger) {
  try {
    const collections = await db.listCollections().toArray()
    const collectionNames = collections.map((c) => c.name)

    const hasAppliances = collectionNames.includes('Appliances')
    const hasFuels = collectionNames.includes('Fuels')
    const hasApplications = collectionNames.includes('Applications')

    // Setup Appliances and Fuels
    if (!hasAppliances || !hasFuels) {
      logger.info('Appliances and/or Fuels collections missing - importing from S3...')

      try {
        const s3Bucket = config.get('cdpUploader.s3Bucket')
        const s3Key = config.get('cdpUploader.s3Prefix') + '/data.xlsx'
        const entities = ['appliances', 'fuels']

        await performS3DataImport(db, s3Bucket, s3Key, entities, logger)

        logger.info('Appliances and Fuels collections imported successfully')
      } catch (importError) {
        logger.warn(
          importError,
          'Failed to import from S3 - Trigger import manually via POST /import'
        )
      }
    } else {
      logger.info('Appliances and Fuels collections already exist')
    }

    // Setup Applications
    if (!hasApplications) {
      logger.info('Setting up Applications collection...')
      await setupApplications(db, {
        dropExisting: false
      })
      logger.info('Applications collection setup complete')
    } else {
      logger.info('Applications collection already exists')
    }
  } catch (error) {
    logger.error(error, 'Failed to setup collections')
    // Don't throw - allow the app to start even if migration fails
  }
}
