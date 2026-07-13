/**
 * Excel Import Utility for Appliances and Fuels
 *
 * Handles importing and updating data from Excel files
 * with upsert logic (insert new, update existing)
 *
 * Usage:
 * node src/migrations/import-from-excel.js --file path/to/file.xlsx --type appliances
 * node src/migrations/import-from-excel.js --file path/to/file.xlsx --type fuels
 * node src/migrations/import-from-excel.js --file path/to/file.xlsx --type both
 */

import xlsx from 'xlsx'
import { MongoClient } from 'mongodb'
import { config } from '../config.js'
import fs from 'node:fs'
import { ENTITY_CONFIG, ENTITY_TYPES } from '../common/helpers/entity-config.js'
import { applianceSchema, fuelSchema } from '../routes/schema.js'

/**
 * Parse Excel file and return data
 */
function parseExcelFile(filePath, sheetName) {
  console.log(`📖 Reading Excel file: ${filePath}`)

  // Read file using fs and pass buffer to xlsx for better compatibility
  const fileBuffer = fs.readFileSync(filePath)
  const workbook = xlsx.read(fileBuffer, { type: 'buffer' })

  const sheet = sheetName
    ? workbook.Sheets[sheetName]
    : workbook.Sheets[workbook.SheetNames[0]]

  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found in Excel file`)
  }

  const data = xlsx.utils.sheet_to_json(sheet, {
    raw: false,
    defval: null
  })

  console.log(`   ✓ Found ${data.length} rows`)
  return data
}

/**
 * Create a proxy to track which CSV columns are accessed during transformation
 */
function createRowProxy(row, accessedColumns) {
  return new Proxy(row, {
    get(target, prop) {
      if (typeof prop === 'string' && prop in target) {
        accessedColumns.add(prop)
      }
      return target[prop]
    }
  })
}

/**
 * Get list of CSV columns that are NOT mapped to any DB field
 * by running a sample row through the transform and tracking access
 */
function getUnmappedColumns(sampleRow, transformFn) {
  const accessedColumns = new Set()
  const proxiedRow = createRowProxy(sampleRow, accessedColumns)
  transformFn(proxiedRow)

  const allColumns = Object.keys(sampleRow)
  return allColumns.filter((col) => !accessedColumns.has(col))
}

/**
 * Use centralized transforms from ENTITY_CONFIG to ensure consistency
 * between CLI imports and CDP production imports
 */
const transformToAppliance = ENTITY_CONFIG[ENTITY_TYPES.APPLIANCES].transform
const transformToFuel = ENTITY_CONFIG[ENTITY_TYPES.FUELS].transform

/**
 * Import appliances with upsert logic
 */
async function importAppliances(db, data, options = {}) {
  console.log(`\n📦 Importing ${data.length} appliances...`)

  // Debug: show column names found in CSV
  if (data.length > 0) {
    console.log(`\n📋 CSV columns found:`)
    Object.keys(data[0]).forEach((col) => console.log(`   - "${col}"`))
    console.log('')
  }

  const collection = db.collection('Appliances')
  let inserted = 0
  let updated = 0
  let failed = 0
  const errors = []

  for (const row of data) {
    try {
      const appliance = transformToAppliance(row)

      if (!appliance.applianceId) {
        throw new Error('Missing applianceId')
      }

      // Joi validation temporarily disabled for testing column mapping
      // const { value: validatedAppliance, error } = applianceSchema.validate(appliance, { abortEarly: false })
      // if (error) {
      //   throw new Error(error.details.map(d => d.message).join(', '))
      // }
      const validatedAppliance = appliance

      const result = await collection.updateOne(
        { applianceId: validatedAppliance.applianceId },
        {
          $set: validatedAppliance,
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true }
      )

      if (result.upsertedCount > 0) {
        inserted++
        if (options.verbose) {
          console.log(`   ✓ Inserted: ${validatedAppliance.applianceId}`)
        }
      } else if (result.modifiedCount > 0) {
        updated++
        if (options.verbose) {
          console.log(`   ↻ Updated: ${validatedAppliance.applianceId}`)
        }
      }
    } catch (error) {
      failed++
      errors.push({ row, error: error.message })
      console.error(
        `   ✗ Failed: ${row.applianceId || 'Unknown'} - ${error.message}`
      )
    }
  }

  console.log(`\n✅ Appliances Import Complete:`)
  console.log(`   📝 Inserted: ${inserted}`)
  console.log(`   ↻ Updated: ${updated}`)
  console.log(`   ✗ Failed: ${failed}`)

  // Report on unmapped CSV columns and unfilled schema fields
  if (data.length > 0) {
    // Dynamically detect unmapped columns by tracking which ones are accessed
    const unmappedColumns = getUnmappedColumns(data[0], transformToAppliance)

    if (unmappedColumns.length > 0) {
      console.log(
        `\n⚠️  CSV columns NOT mapped to DB fields (${unmappedColumns.length}):`
      )
      unmappedColumns.forEach((col) => console.log(`   - "${col}"`))
    }

    // Get schema fields from Joi schema
    const schemaFields = Object.keys(applianceSchema.describe().keys)

    // Get fields that are being set in transform (check first row)
    const sampleAppliance = transformToAppliance(data[0])
    const filledFields = Object.keys(sampleAppliance).filter(
      (key) =>
        sampleAppliance[key] !== null &&
        sampleAppliance[key] !== undefined &&
        sampleAppliance[key] !== ''
    )

    const unfilledSchemaFields = schemaFields.filter(
      (field) => !filledFields.includes(field) && field !== 'createdAt' // createdAt is set on insert
    )

    if (unfilledSchemaFields.length > 0) {
      console.log(
        `\n⚠️  Schema fields NOT filled from CSV (${unfilledSchemaFields.length}):`
      )
      unfilledSchemaFields.forEach((field) => console.log(`   - ${field}`))
    }
  }

  return { inserted, updated, failed, errors }
}

/**
 * Import fuels with upsert logic
 */
async function importFuels(db, data, options = {}) {
  console.log(`\n📦 Importing ${data.length} fuels...`)

  const collection = db.collection('Fuels')
  let inserted = 0
  let updated = 0
  let failed = 0
  const errors = []

  for (const row of data) {
    try {
      const fuel = transformToFuel(row)

      if (!fuel.fuelId) {
        throw new Error('Missing fuelId')
      }

      const result = await collection.updateOne(
        { fuelId: fuel.fuelId },
        {
          $set: fuel,
          $setOnInsert: { createdAt: fuel.createdAt }
        },
        { upsert: true }
      )

      if (result.upsertedCount > 0) {
        inserted++
        if (options.verbose) console.log(`   ✓ Inserted: ${fuel.fuelId}`)
      } else if (result.modifiedCount > 0) {
        updated++
        if (options.verbose) console.log(`   ↻ Updated: ${fuel.fuelId}`)
      }
    } catch (error) {
      failed++
      errors.push({ row, error: error.message })
      console.error(
        `   ✗ Failed: ${row.fuelId || 'Unknown'} - ${error.message}`
      )
    }
  }

  console.log(`\n✅ Fuels Import Complete:`)
  console.log(`   📝 Inserted: ${inserted}`)
  console.log(`   ↻ Updated: ${updated}`)
  console.log(`   ✗ Failed: ${failed}`)

  // Report on unmapped CSV columns and unfilled schema fields
  if (data.length > 0) {
    // Dynamically detect unmapped columns by tracking which ones are accessed
    const unmappedColumns = getUnmappedColumns(data[0], transformToFuel)

    if (unmappedColumns.length > 0) {
      console.log(
        `\n⚠️  CSV columns NOT mapped to DB fields (${unmappedColumns.length}):`
      )
      unmappedColumns.forEach((col) => console.log(`   - "${col}"`))
    }

    // Get schema fields from Joi schema
    const schemaFields = Object.keys(fuelSchema.describe().keys)

    // Get fields that are being set in transform (check first row)
    const sampleFuel = transformToFuel(data[0])
    const filledFields = Object.keys(sampleFuel).filter(
      (key) =>
        sampleFuel[key] !== null &&
        sampleFuel[key] !== undefined &&
        sampleFuel[key] !== ''
    )

    const unfilledSchemaFields = schemaFields.filter(
      (field) => !filledFields.includes(field) && field !== 'createdAt' // createdAt is set on insert
    )

    if (unfilledSchemaFields.length > 0) {
      console.log(
        `\n⚠️  Schema fields NOT filled from CSV (${unfilledSchemaFields.length}):`
      )
      unfilledSchemaFields.forEach((field) => console.log(`   - ${field}`))
    }
  }

  return { inserted, updated, failed, errors }
}

/**
 * Main import function
 */
export async function importFromExcel(db, filePath, type, options = {}) {
  console.log(`\n🚀 Starting Excel import from: ${filePath}`)
  console.log(`   Type: ${type}`)

  const results = {}

  // For CSV files, don't use sheet names (they only have one sheet)
  const isCSV = filePath.toLowerCase().endsWith('.csv')
  if (isCSV) {
    console.log(`   📄 Detected CSV file - using first sheet`)
  }

  try {
    if (type === 'appliances' || type === 'both') {
      const sheetName = isCSV ? null : options.appliancesSheet || 'Appliances'
      const data = parseExcelFile(filePath, sheetName)
      results.appliances = await importAppliances(db, data, options)
    }

    if (type === 'fuels' || type === 'both') {
      const sheetName = isCSV ? null : options.fuelsSheet || 'Fuels'
      const data = parseExcelFile(filePath, sheetName)
      results.fuels = await importFuels(db, data, options)
    }

    console.log(`\n🎉 Import completed successfully!`)
    return results
  } catch (error) {
    console.error(`\n❌ Import failed:`, error.message)
    throw error
  }
}

// Standalone execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  const fileIndex = args.indexOf('--file')
  const typeIndex = args.indexOf('--type')
  const verbose = args.includes('--verbose') || args.includes('-v')

  if (fileIndex === -1 || !args[fileIndex + 1]) {
    console.error('❌ Missing --file argument')
    console.log('\nUsage:')
    console.log(
      '  node src/migrations/import-from-excel.js --file <path> --type <appliances|fuels|both>'
    )
    console.log('\nOptions:')
    console.log('  --file <path>     Path to Excel file')
    console.log(
      '  --type <type>     Type: appliances, fuels, or both (default: both)'
    )
    console.log('  --verbose, -v     Show detailed output')
    process.exit(1)
  }

  const filePath = args[fileIndex + 1]
  const type =
    typeIndex !== -1 && args[typeIndex + 1] ? args[typeIndex + 1] : 'both'

  const mongoUrl = config.get('mongo.uri')
  const databaseName = config.get('mongo.databaseName')

  console.log(`Connecting to MongoDB: ${databaseName}`)

  const client = await MongoClient.connect(mongoUrl)
  const db = client.db(databaseName)

  try {
    await importFromExcel(db, filePath, type, { verbose })
  } finally {
    await client.close()
    console.log('\n📤 Database connection closed')
  }
}
