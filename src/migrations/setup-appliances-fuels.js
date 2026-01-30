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

// Collection Schemas
const appliancesValidator = {
  $jsonSchema: {
    bsonType: 'object',
    required: [
      'applianceId',
      'manufacturer',
      'manufacturerAddress',
      'manufacturerContactName',
      'manufacturerContactEmail',
      'manufacturerPhone',
      'modelName',
      'modelNumber',
      'applianceType',
      'isVariant',
      'nominalOutput',
      'allowedFuels',
      'instructionManualTitle',
      'instructionManualDate',
      'instructionManualReference',
      'submittedBy',
      'approvedBy',
      'publishedDate'
    ],
    properties: {
      applianceId: {
        bsonType: 'string',
        description: 'Unique appliance identifier - required'
      },
      permittedFuels: {
        bsonType: ['array', 'null'],
        items: { bsonType: 'string' },
        description: 'Array of permitted fuel IDs'
      },
      manufacturer: {
        bsonType: 'string',
        description: 'Manufacturer name - required'
      },
      manufacturerAddress: {
        bsonType: 'string',
        description: 'Manufacturer physical address - required'
      },
      manufacturerContactName: {
        bsonType: 'string',
        description: 'Primary contact person name - required'
      },
      manufacturerContactEmail: {
        bsonType: 'string',
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
        description: 'Primary contact email - required'
      },
      manufacturerAlternateEmail: {
        bsonType: ['string', 'null'],
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
        description: 'Alternate contact email - optional'
      },
      manufacturerPhone: {
        bsonType: 'string',
        description: 'Contact phone number - required'
      },
      modelName: {
        bsonType: 'string',
        description: 'Appliance model name - required'
      },
      modelNumber: {
        bsonType: 'string',
        description: 'Appliance model number - required'
      },
      applianceType: {
        bsonType: 'string',
        enum: ['Stove', 'Boiler', 'Fire', 'Heater', 'Other'],
        description: 'Type of appliance - required'
      },
      isVariant: {
        bsonType: 'bool',
        description:
          'Whether this is a variant of existing appliance - required'
      },
      existingAuthorisedAppliance: {
        bsonType: ['string', 'null'],
        description: 'Reference to existing appliance if variant - optional'
      },
      nominalOutput: {
        bsonType: 'number',
        minimum: 0,
        description: 'Nominal output in kW - required'
      },
      allowedFuels: {
        bsonType: 'string',
        description: 'Comma-separated list of allowed fuels - required'
      },
      testReport: {
        bsonType: ['object', 'null'],
        properties: {
          filename: { bsonType: 'string' },
          url: { bsonType: 'string' },
          uploadDate: { bsonType: 'date' }
        },
        description: 'Test report file details - optional'
      },
      technicalDrawings: {
        bsonType: ['object', 'null'],
        properties: {
          filename: { bsonType: 'string' },
          url: { bsonType: 'string' },
          uploadDate: { bsonType: 'date' }
        },
        description: 'Technical drawings file details - optional'
      },
      ceMark: {
        bsonType: ['object', 'null'],
        properties: {
          filename: { bsonType: 'string' },
          url: { bsonType: 'string' },
          uploadDate: { bsonType: 'date' }
        },
        description: 'CE mark certificate file details - optional'
      },
      conditionsForUse: {
        bsonType: ['object', 'null'],
        properties: {
          filename: { bsonType: 'string' },
          url: { bsonType: 'string' },
          uploadDate: { bsonType: 'date' }
        },
        description: 'Conditions for use document - optional'
      },
      instructionManualTitle: {
        bsonType: 'string',
        description: 'Instruction manual title - required'
      },
      instructionManualDate: {
        bsonType: 'date',
        description: 'Instruction manual publication date - required'
      },
      instructionManualReference: {
        bsonType: 'string',
        description: 'Instruction manual reference/version - required'
      },
      additionalConditions: {
        bsonType: ['string', 'null'],
        description: 'Additional conditions for use - optional'
      },
      submittedBy: {
        bsonType: 'string',
        description: 'Name of person who submitted - required'
      },
      approvedBy: {
        bsonType: 'string',
        description: 'Name of person who approved - required'
      },
      publishedDate: {
        bsonType: 'date',
        description: 'Publication date - required'
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

const fuelsValidator = {
  $jsonSchema: {
    bsonType: 'object',
    required: [
      'fuelId',
      'manufacturerName',
      'manufacturerAddress',
      'manufacturerContactName',
      'manufacturerContactEmail',
      'manufacturerPhone',
      'representativeName',
      'representativeEmail',
      'hasCustomerComplaints',
      'qualityControlSystem',
      'certificationScheme',
      'fuelName',
      'fuelBagging',
      'isBaggedAtSource',
      'fuelDescription',
      'fuelWeight',
      'fuelComposition',
      'sulphurContent',
      'manufacturingProcess',
      'isRebrandedProduct',
      'hasChangedFromOriginal'
    ],
    properties: {
      fuelId: {
        bsonType: 'string',
        description: 'Unique fuel identifier - required'
      },
      manufacturerName: {
        bsonType: 'string',
        description: 'Manufacturer name - required'
      },
      manufacturerAddress: {
        bsonType: 'string',
        description: 'Manufacturer physical address - required'
      },
      manufacturerContactName: {
        bsonType: 'string',
        description: 'Primary contact person name - required'
      },
      manufacturerContactEmail: {
        bsonType: 'string',
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
        description: 'Primary contact email - required'
      },
      manufacturerAlternateEmail: {
        bsonType: ['string', 'null'],
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
        description: 'Alternate contact email - optional'
      },
      manufacturerPhone: {
        bsonType: 'string',
        description: 'Contact phone number - required'
      },
      representativeName: {
        bsonType: 'string',
        description: 'Representative name - required'
      },
      representativeEmail: {
        bsonType: 'string',
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
        description: 'Representative email - required'
      },
      hasCustomerComplaints: {
        bsonType: 'bool',
        description: 'Whether there are customer complaints - required'
      },
      qualityControlSystem: {
        bsonType: 'string',
        description: 'Quality control system description - required'
      },
      certificationScheme: {
        bsonType: 'string',
        description: 'Certification scheme details - required'
      },
      fuelName: {
        bsonType: 'string',
        description: 'Fuel product name - required'
      },
      fuelBagging: {
        bsonType: 'string',
        enum: ['Bagged', 'Loose', 'Bulk'],
        description: 'Fuel bagging type - required'
      },
      isBaggedAtSource: {
        bsonType: 'bool',
        description: 'Whether fuel is bagged at source - required'
      },
      fuelDescription: {
        bsonType: 'string',
        description: 'Detailed fuel description - required'
      },
      fuelWeight: {
        bsonType: 'string',
        description: 'Fuel weight specification - required'
      },
      fuelComposition: {
        bsonType: 'string',
        description: 'Fuel composition details - required'
      },
      sulphurContent: {
        bsonType: 'number',
        minimum: 0,
        maximum: 100,
        description: 'Sulphur content percentage - required'
      },
      manufacturingProcess: {
        bsonType: 'string',
        description: 'Manufacturing process description - required'
      },
      isRebrandedProduct: {
        bsonType: 'bool',
        description: 'Whether this is a rebranded product - required'
      },
      hasChangedFromOriginal: {
        bsonType: 'bool',
        description: 'Whether product has changed from original - required'
      },
      brandNames: {
        bsonType: ['string', 'null'],
        description: 'Comma-separated brand names - optional'
      },
      testReports: {
        bsonType: ['array', 'null'],
        items: {
          bsonType: 'object',
          properties: {
            filename: { bsonType: 'string' },
            url: { bsonType: 'string' },
            uploadDate: { bsonType: 'date' }
          }
        },
        description: 'Test report files - optional'
      },
      additionalDocuments: {
        bsonType: ['array', 'null'],
        items: {
          bsonType: 'object',
          properties: {
            filename: { bsonType: 'string' },
            url: { bsonType: 'string' },
            uploadDate: { bsonType: 'date' }
          }
        },
        description: 'Additional fuel documents - optional'
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

    // Create Appliances collection with validation
    console.log('📦 Creating Appliances collection...')
    await db.createCollection('Appliances', {
      validator: appliancesValidator
    })
    console.log('   ✓ Collection created with schema validation')

    // Create indexes for Appliances
    await db
      .collection('Appliances')
      .createIndex({ applianceId: 1 }, { unique: true })
    await db.collection('Appliances').createIndex({ manufacturer: 1 })
    await db.collection('Appliances').createIndex({ modelName: 1 })
    await db.collection('Appliances').createIndex({ applianceType: 1 })
    await db.collection('Appliances').createIndex({ publishedDate: -1 })
    console.log('   ✓ Indexes created')

    // Create Fuels collection with validation
    console.log('📦 Creating Fuels collection...')
    await db.createCollection('Fuels', {
      validator: fuelsValidator
    })
    console.log('   ✓ Collection created with schema validation')

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

      const sampleAppliance = {
        applianceId: 'APP001',
        permittedFuels: ['FUEL001', 'FUEL002'],
        manufacturer: 'Stoves LTD',
        manufacturerAddress: '24 Bowerfield Lane Newcastle NE638BO',
        manufacturerContactName: 'Joe Bloggs',
        manufacturerContactEmail: 'Joe.bloggs@gmail.com',
        manufacturerAlternateEmail: 'Joe.bloggs2@gmail.com',
        manufacturerPhone: '7846638263',
        modelName: 'Hot Stove 89',
        modelNumber: 'AHS231',
        applianceType: 'Stove',
        isVariant: true,
        existingAuthorisedAppliance: 'Hot Stove 88',
        nominalOutput: 12,
        allowedFuels: 'Wood Logs, Wood Pellets',
        instructionManualTitle: 'Stove manual instructions',
        instructionManualDate: new Date('2024-07-01'),
        instructionManualReference: 'Issue 08',
        additionalConditions:
          'Must be fitted with the supplied secondary air control limiters',
        submittedBy: 'Phil Mitchell',
        approvedBy: 'Bruce Lee',
        publishedDate: new Date('2025-02-04'),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const sampleFuel = {
        fuelId: 'FUEL001',
        manufacturerName: 'Stoves LTD',
        manufacturerAddress: '24 Bowerfield Lane Newcastle NE638BO',
        manufacturerContactName: 'Joe Bloggs',
        manufacturerContactEmail: 'Joe.bloggs@gmail.com',
        manufacturerAlternateEmail: 'Joe.bloggs2@gmail.com',
        manufacturerPhone: '7846638263',
        representativeName: 'Simon Gates',
        representativeEmail: 'Simon.Gates@StovesLTD.com',
        hasCustomerComplaints: true,
        qualityControlSystem: 'We do not manufacture fuels',
        certificationScheme:
          'Fuel authorisation under the clean Air Act 1993 only',
        fuelName: 'Fuel4321',
        fuelBagging: 'Bagged',
        isBaggedAtSource: true,
        fuelDescription:
          'Pillow-shaped briquettes with a single line indentation on one side and a double line indentation on the reverse side',
        fuelWeight: 'Average weight of 125 to 135 grams per briquette',
        fuelComposition: 'The fuel contains anthracite fines (60% to 80%)',
        sulphurContent: 20,
        manufacturingProcess:
          'Roll pressing and heat treatment at about 300 degrees celsius',
        isRebrandedProduct: true,
        hasChangedFromOriginal: false,
        brandNames: 'Fuel brand 1, Fuel brand 2',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await db.collection('Appliances').insertOne(sampleAppliance)
      console.log('   ✓ Sample appliance inserted')

      await db.collection('Fuels').insertOne(sampleFuel)
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
