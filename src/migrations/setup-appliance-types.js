/**
 * Migration to create ApplianceTypes collection with indexes
 *
 * Usage:
 * import { setupApplianceTypes } from './migrations/setup-appliance-types.js'
 * await setupApplianceTypes(db)
 */

/**
 * Main migration function
 * @param {Db} db - MongoDB database instance
 * @param {Object} logger - Logger instance
 */
export async function setupApplianceTypes(db, logger) {
  try {
    const collection = db.collection('ApplianceTypes')

    // Check if collection exists
    const collections = await db.listCollections().toArray()
    const collectionNames = collections.map((c) => c.name)
    const exists = collectionNames.includes('ApplianceTypes')

    if (exists) {
      logger.info('ApplianceTypes collection already exists')

      // Create indexes if they don't exist
      await createApplianceTypesIndexes(collection, logger)
      return
    }

    // Create collection with validation schema
    logger.info('Creating ApplianceTypes collection...')
    await db.createCollection('ApplianceTypes', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['_id', 'name'],
          properties: {
            _id: { bsonType: 'objectId' },
            name: {
              bsonType: 'string',
              description: 'Appliance type name (e.g., Stove, Boiler)'
            },
            isPrimary: {
              bsonType: 'bool',
              description: 'Whether this is a primary appliance type'
            },
            createdAt: {
              bsonType: 'date',
              description: 'Creation timestamp'
            },
            updatedAt: {
              bsonType: 'date',
              description: 'Last update timestamp'
            }
          }
        }
      }
    })

    logger.info('ApplianceTypes collection created successfully')

    // Create indexes
    await createApplianceTypesIndexes(collection, logger)
  } catch (error) {
    logger.error(error, 'Failed to setup ApplianceTypes collection')
    throw error
  }
}

/**
 * Create indexes for ApplianceTypes collection
 * @param {Collection} collection - MongoDB collection instance
 * @param {Object} logger - Logger instance
 */
async function createApplianceTypesIndexes(collection, logger) {
  try {
    // Index on name for faster lookups and uniqueness
    await collection.createIndex({ name: 1 }, { unique: false })

    // Index on isPrimary for filtering
    await collection.createIndex({ isPrimary: 1 })

    logger.info('ApplianceTypes indexes created successfully')
  } catch (error) {
    logger.error(error, 'Failed to create ApplianceTypes indexes')
    throw error
  }
}
