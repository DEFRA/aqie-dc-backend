/**
 * Programmatic migration to create Users, UserAppliances, and UserFuels collections
 * with schema validation and indexes
 *
 * Usage:
 * import { setupUsersAndRelationships } from './migrations/setup-users-relationships.js'
 * await setupUsersAndRelationships(db)
 *
 * Or run standalone:
 * node src/migrations/setup-users-relationships.js
 */

import { MongoClient } from 'mongodb'
import { config } from '../config.js'

// ==================== USERS SCHEMA ====================
const usersValidator = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['userId', 'firstName', 'lastName', 'email', 'role'],
    properties: {
      userId: {
        bsonType: 'string',
        description: 'Unique user identifier - required'
      },
      firstName: {
        bsonType: 'string',
        description: 'User first name - required'
      },
      lastName: {
        bsonType: 'string',
        description: 'User last name - required'
      },
      email: {
        bsonType: 'string',
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
        description: 'User email - required'
      },
      phone: {
        bsonType: ['string', 'null'],
        description: 'User phone - optional'
      },
      role: {
        bsonType: 'string',
        enum: ['admin', 'user', 'manager', 'viewer'],
        description: 'User role - required'
      },
      organization: {
        bsonType: ['string', 'null'],
        description: 'User organization - optional'
      },
      address: {
        bsonType: ['string', 'null'],
        description: 'User address - optional'
      },
      city: {
        bsonType: ['string', 'null'],
        description: 'User city - optional'
      },
      postcode: {
        bsonType: ['string', 'null'],
        description: 'User postcode - optional'
      },
      isActive: {
        bsonType: 'bool',
        description: 'Whether user is active'
      },
      registrationDate: {
        bsonType: ['date', 'null'],
        description: 'User registration date - optional'
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

// ==================== USER-APPLIANCES SCHEMA ====================
const userAppliancesValidator = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['userId', 'applianceId'],
    properties: {
      userId: {
        bsonType: 'string',
        description: 'Reference to Users.userId - required'
      },
      applianceId: {
        bsonType: 'string',
        description: 'Reference to Appliances.applianceId - required'
      },
      assignedDate: {
        bsonType: 'date',
        description: 'Date when appliance was assigned to user'
      },
      status: {
        bsonType: 'string',
        enum: ['active', 'inactive', 'pending', 'expired'],
        description: 'Relationship status'
      },
      notes: {
        bsonType: ['string', 'null'],
        description: 'Additional notes about this relationship - optional'
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

// ==================== USER-FUELS SCHEMA ====================
const userFuelsValidator = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['userId', 'fuelId'],
    properties: {
      userId: {
        bsonType: 'string',
        description: 'Reference to Users.userId - required'
      },
      fuelId: {
        bsonType: 'string',
        description: 'Reference to Fuels.fuelId - required'
      },
      assignedDate: {
        bsonType: 'date',
        description: 'Date when fuel was assigned to user'
      },
      status: {
        bsonType: 'string',
        enum: ['active', 'inactive', 'pending', 'expired'],
        description: 'Relationship status'
      },
      notes: {
        bsonType: ['string', 'null'],
        description: 'Additional notes about this relationship - optional'
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
export async function setupUsersAndRelationships(
  db,
  options = { dropExisting: false }
) {
  console.log('🚀 Starting Users and Relationships migration...')

  try {
    // Drop existing collections if requested
    if (options.dropExisting) {
      console.log('⚠️  Dropping existing collections...')
      const collections = await db.listCollections().toArray()
      const collectionNames = collections.map((c) => c.name)

      if (collectionNames.includes('Users')) {
        await db.collection('Users').drop()
        console.log('   ✓ Dropped Users')
      }
      if (collectionNames.includes('UserAppliances')) {
        await db.collection('UserAppliances').drop()
        console.log('   ✓ Dropped UserAppliances')
      }
      if (collectionNames.includes('UserFuels')) {
        await db.collection('UserFuels').drop()
        console.log('   ✓ Dropped UserFuels')
      }
    }

    // Create Users collection
    console.log('📦 Creating Users collection...')
    await db.createCollection('Users', {
      validator: usersValidator
    })
    console.log('   ✓ Collection created with schema validation')

    // Create indexes for Users
    await db.collection('Users').createIndex({ userId: 1 }, { unique: true })
    await db.collection('Users').createIndex({ email: 1 }, { unique: true })
    await db.collection('Users').createIndex({ role: 1 })
    console.log('   ✓ Indexes created')

    // Create UserAppliances collection
    console.log('📦 Creating UserAppliances collection...')
    await db.createCollection('UserAppliances', {
      validator: userAppliancesValidator
    })
    console.log('   ✓ Collection created with schema validation')

    // Create indexes for UserAppliances (composite unique)
    await db
      .collection('UserAppliances')
      .createIndex({ userId: 1, applianceId: 1 }, { unique: true })
    await db.collection('UserAppliances').createIndex({ userId: 1 })
    await db.collection('UserAppliances').createIndex({ applianceId: 1 })
    await db.collection('UserAppliances').createIndex({ status: 1 })
    console.log('   ✓ Indexes created (composite unique key)')

    // Create UserFuels collection
    console.log('📦 Creating UserFuels collection...')
    await db.createCollection('UserFuels', {
      validator: userFuelsValidator
    })
    console.log('   ✓ Collection created with schema validation')

    // Create indexes for UserFuels (composite unique)
    await db
      .collection('UserFuels')
      .createIndex({ userId: 1, fuelId: 1 }, { unique: true })
    await db.collection('UserFuels').createIndex({ userId: 1 })
    await db.collection('UserFuels').createIndex({ fuelId: 1 })
    await db.collection('UserFuels').createIndex({ status: 1 })
    console.log('   ✓ Indexes created (composite unique key)')

    // Get counts
    const usersCount = await db.collection('Users').countDocuments()
    const userAppliancesCount = await db
      .collection('UserAppliances')
      .countDocuments()
    const userFuelsCount = await db.collection('UserFuels').countDocuments()

    console.log('\n✅ Migration completed successfully!')
    console.log(`   📊 Users: ${usersCount} documents`)
    console.log(`   📊 UserAppliances: ${userAppliancesCount} relationships`)
    console.log(`   📊 UserFuels: ${userFuelsCount} relationships`)
  } catch (error) {
    if (error.code === 48) {
      // Collection already exists
      console.log('⚠️  Collections already exist, skipping creation')
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
    await setupUsersAndRelationships(db, {
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
