/**
 * Programmatic migration to create Appliances and Fuels collections
 * with schema validation and indexes
 *
 * Usage:
 * import { setupAppliancesAndFuels } from './migrations/setup-appliances-fuels.js'
 * await setupAppliancesAndFuels(db)
 *
 * Or run standalone:
 * node src/migrations/setup-appliances-fuels.js
 */

import { MongoClient } from 'mongodb'
import { config } from '../config.js'
import { applianceSchema, fuelSchema } from '../routes/schema.js'
import applianceExample from '../sample-data/appliance-example.js'
import fuelExample from '../sample-data/fuel-example.js'

/**
 * Validate data using Joi schemas
 * @param {Object} data - Data to validate
 * @param {string} type - 'appliance' or 'fuel'
 * @returns {Object} Validated data
 */
function validateWithJoi(data, type) {
  const schema = type === 'appliance' ? applianceSchema : fuelSchema
  const { value, error } = schema.validate(data, { abortEarly: false })
  if (error) {
    console.warn(
      `   ⚠️  Joi validation warning for ${type}: ${error.details.map((d) => d.message).join(', ')}`
    )
  }
  return value || data // Return validated value if available, otherwise original data
}

/**
 * Main migration function
 * @param {Db} db - MongoDB database instance
 * @param {Object} options - Migration options
 * @param {boolean} options.dropExisting - Drop existing collections before creating
 * @param {boolean} options.insertSamples - Insert sample data
 */
export async function setupAppliancesAndFuels(
  db,
  options = { dropExisting: false, insertSamples: false }
) {
  console.log('🚀 Starting Appliances and Fuels migration...')

  try {
    // Drop existing collections if requested
    if (options.dropExisting) {
      console.log('⚠️  Dropping existing collections...')
      const collections = await db.listCollections().toArray()
      const collectionNames = collections.map((c) => c.name)

      if (collectionNames.includes('Appliances')) {
        await db.collection('Appliances').drop()
        console.log('   ✓ Dropped Appliances')
      }
      if (collectionNames.includes('Fuels')) {
        await db.collection('Fuels').drop()
        console.log('   ✓ Dropped Fuels')
      }
    }

    // Create Appliances collection
    console.log('📦 Creating Appliances collection...')
    await db.createCollection('Appliances')
    console.log('   ✓ Collection created')

    // Create indexes for Appliances
    await db.collection('Appliances').createIndex({ id: 1 }, { unique: true })
    await db.collection('Appliances').createIndex({ manufacturer: 1 })
    await db.collection('Appliances').createIndex({ modelName: 1 })
    await db.collection('Appliances').createIndex({ applianceType: 1 })
    await db.collection('Appliances').createIndex({ publishedDate: -1 })
    console.log('   ✓ Indexes created')

    // Create Fuels collection
    console.log('📦 Creating Fuels collection...')
    await db.createCollection('Fuels')
    console.log('   ✓ Collection created')

    // Create indexes for Fuels
    await db.collection('Fuels').createIndex({ fuelId: 1 }, { unique: true })
    await db.collection('Fuels').createIndex({ manufacturerName: 1 })
    await db.collection('Fuels').createIndex({ fuelName: 1 })
    await db.collection('Fuels').createIndex({ fuelBagging: 1 })
    await db.collection('Fuels').createIndex({ certificationScheme: 1 })
    console.log('   ✓ Indexes created')

    // Insert sample data if requested
    if (options.insertSamples) {
      console.log('📝 Inserting sample data...')

      const validatedAppliance = validateWithJoi(applianceExample, 'appliance')
      await db.collection('Appliances').insertOne(validatedAppliance)
      console.log('   ✓ Sample appliance inserted')

      const validatedFuel = validateWithJoi(fuelExample, 'fuel')
      await db.collection('Fuels').insertOne(validatedFuel)
      console.log('   ✓ Sample fuel inserted')
    }

    // Verification
    const appliancesCount = await db.collection('Appliances').countDocuments()
    const fuelsCount = await db.collection('Fuels').countDocuments()

    console.log('\n✅ Migration completed successfully!')
    console.log(`   📊 Appliances: ${appliancesCount} documents`)
    console.log(`   📊 Fuels: ${fuelsCount} documents`)

    return {
      success: true,
      collections: {
        appliances: appliancesCount,
        fuels: fuelsCount
      }
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    throw error
  }
}

// Standalone execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const mongoUrl = config.get('mongo.uri')
  const databaseName = config.get('mongo.databaseName')

  console.log(`Connecting to MongoDB: ${databaseName}`)

  const client = await MongoClient.connect(mongoUrl)
  const db = client.db(databaseName)

  try {
    await setupAppliancesAndFuels(db, {
      dropExisting: process.argv.includes('--drop'),
      insertSamples: process.argv.includes('--samples')
    })
  } finally {
    await client.close()
    console.log('Database connection closed')
  }
}
