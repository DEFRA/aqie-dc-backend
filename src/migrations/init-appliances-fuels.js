/**
 * Migration script to create Appliances and Fuels collections
 * with schema validation and indexes
 *
 * Run this script using:
 * - CDP Terminal: mongosh < src/migrations/init-appliances-fuels.js
 * - Or manually copy/paste sections into mongosh
 *
 * This file is meant to be run in MongoDB shell (mongosh), not Node.js
 * eslint-disable-next-line
 */

/* global db, print */

// ==================== APPLIANCES COLLECTION ====================
db.createCollection('Appliances', {
  validator: {
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
})

// Create indexes for Appliances
db.Appliances.createIndex({ applianceId: 1 }, { unique: true })
db.Appliances.createIndex({ manufacturer: 1 })
db.Appliances.createIndex({ modelName: 1 })
db.Appliances.createIndex({ applianceType: 1 })
db.Appliances.createIndex({ publishedDate: -1 })

print('✓ Appliances collection created with validation and indexes')

// ==================== FUELS COLLECTION ====================
db.createCollection('Fuels', {
  validator: {
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
})

// Create indexes for Fuels
db.Fuels.createIndex({ fuelId: 1 }, { unique: true })
db.Fuels.createIndex({ manufacturerName: 1 })
db.Fuels.createIndex({ fuelName: 1 })
db.Fuels.createIndex({ fuelBagging: 1 })
db.Fuels.createIndex({ certificationScheme: 1 })

print('✓ Fuels collection created with validation and indexes')

// ==================== SAMPLE DATA ====================

// Sample Appliance
db.Appliances.insertOne({
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
})

print('✓ Sample appliance inserted')

// Sample Fuel
db.Fuels.insertOne({
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
  certificationScheme: 'Fuel authorisation under the clean Air Act 1993 only',
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
})

print('✓ Sample fuel inserted')

// Verify collections
print('\n=== Verification ===')
print('Collections:')
// show collections
print('\nAppliances count: ' + db.Appliances.countDocuments())
print('Fuels count: ' + db.Fuels.countDocuments())
print('\n✓ Migration complete!')
