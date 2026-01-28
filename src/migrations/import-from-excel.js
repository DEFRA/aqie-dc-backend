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

/**
 * Parse Excel file and return data
 */
function parseExcelFile(filePath, sheetName) {
  console.log(`📖 Reading Excel file: ${filePath}`)
  const workbook = xlsx.readFile(filePath)

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
 */
function transformToAppliance(row) {
  const appliance = {
    applianceId: row.applianceId || row.ApplianceID || row.ID,
    manufacturer: row.manufacturer || row.Manufacturer,
    manufacturerAddress: row.manufacturerAddress || row['Manufacturer Address'],
    manufacturerContactName: row.manufacturerContactName || row['Contact Name'],
    manufacturerContactEmail:
      row.manufacturerContactEmail || row['Contact Email'],
    manufacturerPhone: row.manufacturerPhone || row['Contact Phone'],
    modelName: row.modelName || row['Model Name'],
    modelNumber: row.modelNumber || row['Model Number'],
    applianceType: row.applianceType || row['Appliance Type'],
    isVariant: parseBoolean(row.isVariant || row['Is Variant']),
    nominalOutput: parseFloat(
      row.nominalOutput || row['Nominal Output (kW)'] || 0
    ),
    allowedFuels: row.allowedFuels || row['Allowed Fuels'],
    instructionManualTitle: row.instructionManualTitle || row['Manual Title'],
    instructionManualDate: parseDate(
      row.instructionManualDate || row['Manual Date']
    ),
    instructionManualReference:
      row.instructionManualReference || row['Manual Reference'],
    submittedBy: row.submittedBy || row['Submitted By'],
    approvedBy: row.approvedBy || row['Approved By'],
    publishedDate: parseDate(row.publishedDate || row['Published Date']),
    updatedAt: new Date()
  }

  // Optional fields
  if (row.manufacturerAlternateEmail || row['Alternate Email']) {
    appliance.manufacturerAlternateEmail =
      row.manufacturerAlternateEmail || row['Alternate Email']
  }

  if (row.existingAuthorisedAppliance || row['Existing Appliance']) {
    appliance.existingAuthorisedAppliance =
      row.existingAuthorisedAppliance || row['Existing Appliance']
  }

  if (row.additionalConditions || row['Additional Conditions']) {
    appliance.additionalConditions =
      row.additionalConditions || row['Additional Conditions']
  }

  if (row.permittedFuels || row['Permitted Fuels']) {
    const fuelsString = row.permittedFuels || row['Permitted Fuels']
    appliance.permittedFuels = fuelsString
      ? fuelsString.split(',').map((f) => f.trim())
      : null
  }

  // Set createdAt only for new documents (will be ignored in updates)
  appliance.createdAt = new Date()

  return appliance
}

/**
 * Transform Excel row to Fuel document
 */
function transformToFuel(row) {
  const fuel = {
    fuelId: row.fuelId || row.FuelID || row.ID,
    manufacturerName: row.manufacturerName || row['Manufacturer Name'],
    manufacturerAddress: row.manufacturerAddress || row['Manufacturer Address'],
    manufacturerContactName: row.manufacturerContactName || row['Contact Name'],
    manufacturerContactEmail:
      row.manufacturerContactEmail || row['Contact Email'],
    manufacturerPhone: row.manufacturerPhone || row['Contact Phone'],
    representativeName: row.representativeName || row['Representative Name'],
    representativeEmail: row.representativeEmail || row['Representative Email'],
    hasCustomerComplaints: parseBoolean(
      row.hasCustomerComplaints || row['Has Complaints']
    ),
    qualityControlSystem:
      row.qualityControlSystem || row['Quality Control System'],
    certificationScheme: row.certificationScheme || row['Certification Scheme'],
    fuelName: row.fuelName || row['Fuel Name'],
    fuelBagging: row.fuelBagging || row['Fuel Bagging'],
    isBaggedAtSource: parseBoolean(
      row.isBaggedAtSource || row['Bagged at Source']
    ),
    fuelDescription: row.fuelDescription || row['Fuel Description'],
    fuelWeight: row.fuelWeight || row['Fuel Weight'],
    fuelComposition: row.fuelComposition || row['Fuel Composition'],
    sulphurContent: parseFloat(
      row.sulphurContent || row['Sulphur Content (%)'] || 0
    ),
    manufacturingProcess:
      row.manufacturingProcess || row['Manufacturing Process'],
    isRebrandedProduct: parseBoolean(
      row.isRebrandedProduct || row['Is Rebranded']
    ),
    hasChangedFromOriginal: parseBoolean(
      row.hasChangedFromOriginal || row['Changed from Original']
    ),
    updatedAt: new Date()
  }

  // Optional fields
  if (row.manufacturerAlternateEmail || row['Alternate Email']) {
    fuel.manufacturerAlternateEmail =
      row.manufacturerAlternateEmail || row['Alternate Email']
  }

  if (row.brandNames || row['Brand Names']) {
    fuel.brandNames = row.brandNames || row['Brand Names']
  }

  // Set createdAt only for new documents
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

      const result = await collection.updateOne(
        { applianceId: appliance.applianceId },
        {
          $set: appliance,
          $setOnInsert: { createdAt: appliance.createdAt }
        },
        { upsert: true }
      )

      if (result.upsertedCount > 0) {
        inserted++
        if (options.verbose)
          {console.log(`   ✓ Inserted: ${appliance.applianceId}`)}
      } else if (result.modifiedCount > 0) {
        updated++
        if (options.verbose)
          {console.log(`   ↻ Updated: ${appliance.applianceId}`)}
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

  try {
    if (type === 'appliances' || type === 'both') {
      const sheetName = options.appliancesSheet || 'Appliances'
      const data = parseExcelFile(filePath, sheetName)
      results.appliances = await importAppliances(db, data, options)
    }

    if (type === 'fuels' || type === 'both') {
      const sheetName = options.fuelsSheet || 'Fuels'
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
