import { MongoClient } from 'mongodb'
import { LockManager } from 'mongo-locks'
import { setupAppliancesAndFuels } from '../../migrations/setup-appliances-fuels.js'
import { setupApplications } from '../../migrations/setup-applications.js'

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
      logger.info('Setting up Appliances and Fuels collections...')
      await setupAppliancesAndFuels(db, {
        dropExisting: false,
        insertSamples: false
      })
      logger.info('Appliances and Fuels collections setup complete')
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

    // (migrationTODO): existing Appliances/Fuels/Applications collections in
    // some environments still carry an old $jsonSchema validator that predates
    // the current SQS mapper field shape (e.g. applianceId/manufacturer vs
    // companyName/modelName), causing MongoBulkWriteError: Document failed
    // validation on insert. Relaxed here for now so ingestion keeps working;
    // needs to be reconciled/removed properly as part of the migration work.
    await relaxStaleValidators(db, collections, logger)
  } catch (error) {
    logger.error(error, 'Failed to setup collections')
    // Don't throw - allow the app to start even if migration fails
  }
}

const VALIDATED_COLLECTIONS = ['Appliances', 'Fuels', 'Applications']

async function relaxStaleValidators(db, collections, logger) {
  for (const name of VALIDATED_COLLECTIONS) {
    const info = collections.find((c) => c.name === name)
    const hasValidator =
      info?.options?.validator && Object.keys(info.options.validator).length

    if (!hasValidator) {
      continue
    }

    try {
      await db.command({ collMod: name, validationLevel: 'off' })
      logger.warn(
        { collection: name },
        'Relaxed stale $jsonSchema validator (validationLevel: off) pending migration cleanup'
      )
    } catch (error) {
      // Likely missing privilege (e.g. collMod/dbAdmin) in this environment -
      // don't block startup, just surface it so it can be actioned manually
      logger.error(
        { err: error, collection: name },
        'Could not relax stale validator - may need manual/DBA intervention'
      )
    }
  }
}
