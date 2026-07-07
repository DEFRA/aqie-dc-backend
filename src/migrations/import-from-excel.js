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
import { parse, isValid } from 'date-fns'
import fs from 'fs'
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
 * Transform Excel row to Appliance document
 * Maps CSV columns to schema fields (no fallbacks - single CSV format)
 */

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

function transformToAppliance(row) {
  // Determine technicalApproval based on Reviewer dates
  // Read both columns upfront so the Proxy tracks them both
  const reviewerApproveDate = row['Reviewer Approve Date']
  const reviewerRejectDate = row['Reviewer Reject Date']

  let technicalApproval = 'Uncertified'
  let technicalApprovalDate = null

  // Parse both dates for comparison
  const approveDate = reviewerApproveDate
    ? parseDate(reviewerApproveDate)
    : null
  const rejectDate = reviewerRejectDate ? parseDate(reviewerRejectDate) : null

  if (approveDate && rejectDate) {
    // Both dates exist - use the later one
    if (approveDate >= rejectDate) {
      technicalApproval = 'Certified'
      technicalApprovalDate = approveDate
    } else {
      technicalApproval = 'Revoked'
      technicalApprovalDate = rejectDate
    }
  } else if (approveDate) {
    technicalApproval = 'Certified'
    technicalApprovalDate = approveDate
  } else if (rejectDate) {
    technicalApproval = 'Revoked'
    technicalApprovalDate = rejectDate
  }

  const appliance = {
    applicationId: row['Application Number'], //unsure
    applianceId: row['Appliance ID'],
    modelName: row['Appliance Name (Title)'],
    companyName: row['Manufacturer Name'], 
    companyAddress: row['Manufacturer Address'], //connection not mentitoned on cilent schema
    applianceType: row['Appliance Types'],
    allowedFuels: parseArrayField(row['Permitted Fuels']),
    nominalOutput: parseFloat(row['Output Value'] || 0),
    instructionManualTitle: row['Instructions Manual Title'],
    instructionManualVersion: row['Instructions Manual Reference'],
    instructionManualDate: parseDate(row['Instructions Manual Date']),
    instructionManualAdditionalInfo: row['Additional Comments'],
    additionalConditionComments: row['Additional Condition Comments'],
    submittedBy: row['Submitted By (User)'],
    submittedDate: parseDate(row['Reviewer Assign Date']),
    publishedDate: parseDate(row['WP Published Date']), //ask about this field
    technicalApproval,
    technicalApprovalDate,
    reviewedBy: row['Reviewed By (User)'],
    reviewerAssignDate: row['Reviewer Assign Date']
      ? parseDate(row['Reviewer Assign Date'])
      : null,
    //englandApproval: status field in csv doesnt match
    englandApprovedBy: row['England User'],
    englandDateFirstAuthorised: parseDate(row['England Approve Date']),
    //scotlandApproval: status field in csv doesnt match //correct fields mapping but need to change the statuses
    scotlandApprovedBy: row['Scotland User'],
    scotlandDateFirstAuthorised: parseDate(row['Scotland Approve Date']),
    //walesApproval: status field in csv doesnt match 
    walesApprovedBy: row['Wales User'],
    walesDateFirstAuthorised: parseDate(row['Wales Approve Date']),
    //nIrelandApproval: status field in csv doesnt match
    nIrelandApprovedBy: row['N Ireland User'],
    nIrelandDateFirstAuthorised: parseDate(row['N Ireland Approve Date']),
    updatedAt: new Date(),

    //legacy fields (not in schema)
    englandStatus: row['England Status'],
    scotlandStatus: row['Scotland Status'],
    walesStatus: row['Wales Status'],
    nIrelandStatus: row['N Ireland Status'],

    fuelTypes: row['Fuel Types'],
    postId: row['Post ID'],
    wpPostStatus: row['WP Post Status'],
    manufacturerPostId: row['Manufacturer Post ID'],
    outputUnitId: row['Output Unit ID'],
    servicingManualTitle: row['Servicing Manual Title'],
    servicingManualReference: row['Servicing Manual Reference'],
    servicingManualDate: row['Servicing Manual Date'],
    additionalConditionIds: row['Additional Condition IDs'],
    //additionalConditionComments: row['Additional Condition Comments'],
    additionalComments: row['Additional Comments'],
    linkedApplications: row['Linked Applications'],
    commentToDA: row['Comment to DA'],
    userComment: row['User Comment'],
    comments: row['Comments'],
    englandAssignedDate: row['England Assigned Date'],
    englandPublishDate: row['England Publish Date'],
    englandStatutoryInstruments: row['England Statutory Instruments'],
    walesAssignedDate: row['Wales Assigned Date'],
    walesPublishDate: row['Wales Publish Date'],
    walesStatutoryInstruments: row['Wales Statutory Instruments'],
    scotlandAssignedDate: row['Scotland Assigned Date'],
    scotlandPublishDate: row['Scotland Publish Date'],
    scotlandStatutoryInstruments: row['Scotland Statutory Instruments'],
    nIrelandAssignedDate: row['N Ireland Assigned Date'],
    nIrelandPublishDate: row['N Ireland Publish Date'],
    nIrelandStatutoryInstruments: row['N Ireland Statutory Instruments']

    //new and introduced fields in DEFRA forms schema but not in csv
    // isUkBased - needs default
    //isVariant - needs default
    //declaration - needs default
  }

  return appliance
}

/**
 * Transform Excel row to Fuel document
 */
function transformToFuel(row) {
  const fuel = {
    
    updatedAt: new Date()
  }

  fuel.createdAt = new Date()

  return fuel
}

/**
 * Parse boolean values from Excel
 */
function parseBoolean(value) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim()
    if (['true', 'yes', '1', 'y'].includes(lower)) return true
    if (['false', 'no', '0', 'n'].includes(lower)) return false
  }
  return Boolean(value)
}

/**
 * Parse array/list values from Excel (comma-separated strings)
 */
function parseArrayField(value) {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return [value]
}

/**
 * Parse date values from Excel
 */
function parseDate(value) {
  if (!value) return new Date()
  if (value instanceof Date) return value

  // Try parsing common date formats
  const formats = [
    'dd/MM/yyyy',
    'MM/dd/yyyy',
    'yyyy-MM-dd',
    'dd-MM-yyyy',
    'MM-dd-yyyy'
  ]

  for (const format of formats) {
    const date = parse(value, format, new Date())
    if (isValid(date)) return date
  }

  // Fallback to native Date parsing
  const date = new Date(value)
  return isValid(date) ? date : new Date()
}

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

  const mongoUrl = config.get('mongo.mongoUrl')
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
