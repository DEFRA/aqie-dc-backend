/**
 * Programmatic migration to create Applications collection
 * with schema validation and indexes
 *
 * Applications store submission data (not user identity).
 * Appliances and Fuels link to Applications via applicationId field.
 *
 * Usage:
 * import { setupApplications } from './migrations/setup-applications.js'
 * await setupApplications(db)
 *
 * Or run standalone:
 * node src/migrations/setup-applications.js
 */

import { MongoClient } from 'mongodb'
import { config } from '../config.js'

// ==================== APPLICATIONS SCHEMA ====================
const applicationsValidator = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['applicationId', 'status', 'applicationType'],
    properties: {
      applicationId: {
        bsonType: 'string',
        description: 'Unique application identifier - required'
      },
      status: {
        bsonType: 'string',
        enum: ['new', 'inprogress', 'complete'],
        description: 'Application status - required'
      },
      applicationType: {
        bsonType: 'string',
        enum: ['appliance', 'fuel'],
        description: 'Type of application (appliance or fuel) - required'
      },
      reviewer: {
        bsonType: ['string', 'null'],
        description: 'Reviewer name or ID - optional'
      },
      reviewNotes: {
        bsonType: ['string', 'null'],
        description: 'Notes from reviewer - optional'
      },
      submittedAt: {
        bsonType: ['date', 'null'],
        description: 'When the application was submitted - optional'
      },
      reviewedAt: {
        bsonType: ['date', 'null'],
        description: 'When the application was reviewed - optional'
      },
      createdAt: {
        bsonType: 'date',
        description: 'Record creation timestamp'
      },
      updatedAt: {
        bsonType: 'date',
        description: 'Record last update timestamp'
      }
    }
  }
}

/**
 * Main migration function
 */
export async function setupApplications(db, options = { dropExisting: false }) {
  console.log('🚀 Starting Applications migration...')

  try {
    // Drop existing collection if requested
    if (options.dropExisting) {
      console.log('⚠️  Dropping existing collection...')
      const collections = await db.listCollections().toArray()
      const collectionNames = collections.map((c) => c.name)

      if (collectionNames.includes('Applications')) {
        await db.collection('Applications').drop()
        console.log('   ✓ Dropped Applications')
      }
    }

    // Create Applications collection
    console.log('📦 Creating Applications collection...')
    await db.createCollection('Applications', {
      validator: applicationsValidator
    })
    console.log('   ✓ Collection created with schema validation')

    // Create indexes for Applications
    await db
      .collection('Applications')
      .createIndex({ applicationId: 1 }, { unique: true })
    await db.collection('Applications').createIndex({ status: 1 })
    console.log('   ✓ Indexes created')

    // Get count
    const applicationsCount = await db
      .collection('Applications')
      .countDocuments()

    console.log('\n✅ Migration completed successfully!')
    console.log(`   📊 Applications: ${applicationsCount} documents`)
  } catch (error) {
    if (error.code === 48) {
      // Collection already exists
      console.log(
        '⚠️  Applications collection already exists, skipping creation'
      )
    } else {
      throw error
    }
  }
}

/**
 * Standalone execution
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const client = new MongoClient(config.get('mongoUri'))

  try {
    await client.connect()
    console.log('✓ Connected to MongoDB\n')

    const db = client.db()
    await setupApplications(db, {
      dropExisting: false
    })
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await client.close()
    console.log('\n✓ Database connection closed')
  }
}
