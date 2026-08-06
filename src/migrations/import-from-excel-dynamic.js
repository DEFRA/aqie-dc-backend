/**
 * Dynamic Excel Import Utility
 * Handles importing and updating data from Excel files for any entity type
 * with upsert logic (insert new, update existing)
 */

import xlsx from 'xlsx'
import { ENTITY_CONFIG } from '../common/helpers/entity-config.js'
import fs from 'node:fs'

/**
 * Parse Excel file and return data from a specific sheet
 */
function parseExcelSheet(filePath, sheetName) {
  //const fileExtension = filePath.toLowerCase().endsWith('.csv') ? 'csv' : 'xlsx'
  // Read file using fs and pass buffer to xlsx for better compatibility with CSV
  const fileBuffer = fs.readFileSync(filePath)
  const workbook = xlsx.read(fileBuffer, { type: 'buffer' })

  // If sheet name is provided, try to find it. Otherwise, use first sheet.
  // For CSV files uploaded with .xlsx extension, sheetName will be null and we use the first sheet.
  let sheet
  if (sheetName && workbook.Sheets[sheetName]) {
    sheet = workbook.Sheets[sheetName]
  } else if (sheetName) {
    // Sheet name was requested but not found - likely a CSV file, use first sheet
    sheet = workbook.Sheets[workbook.SheetNames[0]]
  } else {
    // No sheet name provided, use first sheet
    sheet = workbook.Sheets[workbook.SheetNames[0]]
  }

  if (!sheet) {
    throw new Error(`No data found in file`)
  }

  const data = xlsx.utils.sheet_to_json(sheet, {
    raw: false,
    defval: null
  })

  return data
}

/**
 * Import data for a specific entity
 */
async function importEntity(
  db,
  filePath,
  entityConfig,
  sheetName,
  verbose = false
) {
  const { collectionName, transform, uniqueKey } = entityConfig
  const actualSheetName = sheetName || entityConfig.defaultSheetName

  if (verbose) {
    console.log(`\n📊 Processing ${collectionName}...`)
    console.log(`   Sheet: ${actualSheetName}`)
  }

  // Parse Excel data
  const rows = parseExcelSheet(filePath, actualSheetName)

  if (rows.length === 0) {
    if (verbose) {
      console.log(`   ⚠️  No data found in sheet "${actualSheetName}"`)
    }
    return {
      entity: collectionName,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: []
    }
  }

  if (verbose) {
    console.log(`   Found ${rows.length} rows`)
  }

  const collection = db.collection(collectionName)
  const results = {
    entity: collectionName,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: []
  }

  // Process each row
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    try {
      // Transform row to document
      const document = transform(row)

      // Handle entities with composite keys (UserAppliances, UserFuels)
      if (!uniqueKey) {
        // Composite key for relationship entities
        if (!document.userId || (!document.applianceId && !document.fuelId)) {
          results.errors.push({
            row: i + 2,
            error: `Missing required fields (userId and applianceId/fuelId)`
          })
          results.skipped++
          continue
        }

        const filter = document.applianceId
          ? { userId: document.userId, applianceId: document.applianceId }
          : { userId: document.userId, fuelId: document.fuelId }

        const existing = await collection.findOne(filter)

        if (existing) {
          // Update existing relationship
          const { createdAt, ...updateDoc } = document
          await collection.updateOne(filter, {
            $set: updateDoc,
            $setOnInsert: { createdAt: existing.createdAt }
          })
          results.updated++

          if (verbose) {
            console.log(
              `   ✓ Updated: ${document.userId} - ${document.applianceId || document.fuelId}`
            )
          }
        } else {
          // Insert new relationship
          await collection.insertOne(document)
          results.inserted++

          if (verbose) {
            console.log(
              `   + Inserted: ${document.userId} - ${document.applianceId || document.fuelId}`
            )
          }
        }
      } else {
        // Standard single unique key logic
        if (!document[uniqueKey]) {
          results.errors.push({
            row: i + 2, // +2 for header and 0-index
            error: `Missing ${uniqueKey}`
          })
          results.skipped++
          continue
        }

        // Upsert logic
        const filter = { [uniqueKey]: document[uniqueKey] }
        const existing = await collection.findOne(filter)

        if (existing) {
          // Update existing
          const { createdAt, ...updateDoc } = document
          await collection.updateOne(filter, {
            $set: updateDoc,
            $setOnInsert: { createdAt: existing.createdAt }
          })
          results.updated++

          if (verbose) {
            console.log(`   ✓ Updated: ${document[uniqueKey]}`)
          }
        } else {
          // Insert new
          await collection.insertOne(document)
          results.inserted++

          if (verbose) {
            console.log(`   + Inserted: ${document[uniqueKey]}`)
          }
        }
      }
    } catch (error) {
      // Log detailed validation error for debugging
      const errorDetails = error.message
      if (error.errInfo && error.errInfo.details) {
        console.log(
          `   ✗ Validation error for ${collectionName} row ${i + 2}:`,
          JSON.stringify(error.errInfo.details, null, 2)
        )
      }

      results.errors.push({
        row: i + 2,
        error: errorDetails
      })
      results.skipped++

      if (verbose) {
        console.log(`   ✗ Error: ${errorDetails}`)
      }
    }
  }

  if (verbose) {
    console.log(`\n   Summary:`)
    console.log(`   ✓ Inserted: ${results.inserted}`)
    console.log(`   ↻ Updated:  ${results.updated}`)
    console.log(`   ⊘ Skipped:  ${results.skipped}`)
    if (results.errors.length > 0) {
      console.log(`   ✗ Errors:   ${results.errors.length}`)
    }
  }

  return results
}

/**
 * Main import function - processes multiple entities
 *
 * @param {Object} db - MongoDB database instance
 * @param {string} filePath - Path to Excel file
 * @param {Array} entities - Array of entity configurations
 *   Example: [{ type: 'appliances', sheetName: 'Appliances' }, { type: 'fuels' }]
 * @param {Object} options - Import options
 * @returns {Promise<Array>} Results for each entity
 */
export async function importFromExcel(db, filePath, entities, options = {}) {
  const { verbose = false } = options

  // // For CSV files, don't use sheet names (they only have one sheet)
  // const isCSV = filePath.toLowerCase().endsWith('.csv')
  // // NOTE: CSV support commented out - using Excel format with named sheets only

  if (verbose) {
    console.log('🚀 Starting Excel import...')
    console.log(`📁 File: ${filePath}`)
    console.log(`📋 Entities: ${entities.map((e) => e.type).join(', ')}`)
  }

  const allResults = []

  // Process each entity
  for (const entity of entities) {
    const { type, sheetName } = entity
    const entityConfig = ENTITY_CONFIG[type]

    if (!entityConfig) {
      const error = {
        entity: type,
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: [{ error: `Unknown entity type: ${type}` }]
      }
      allResults.push(error)

      if (verbose) {
        console.log(`\n❌ Unknown entity type: ${type}`)
      }
      continue
    }

    try {
      // Use provided sheet name or default from entity config
      // // For CSV files, pass null to use the first sheet. For Excel files, use provided sheet name or default.
      // const actualSheetName = isCSV ? null : sheetName || entityConfig.defaultSheetName
      const actualSheetName = sheetName || entityConfig.defaultSheetName

      const result = await importEntity(
        db,
        filePath,
        entityConfig,
        actualSheetName,
        verbose
      )
      allResults.push(result)
    } catch (error) {
      allResults.push({
        entity: entityConfig.collectionName,
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: [{ error: error.message }]
      })

      if (verbose) {
        console.log(`\n❌ Failed to import ${type}: ${error.message}`)
      }
    }
  }

  if (verbose) {
    console.log('\n✨ Import process completed!')
    console.log('\n📊 Overall Summary:')
    allResults.forEach((result) => {
      console.log(`\n   ${result.entity}:`)
      console.log(`     Inserted: ${result.inserted}`)
      console.log(`     Updated:  ${result.updated}`)
      console.log(`     Skipped:  ${result.skipped}`)
      if (result.errors.length > 0) {
        console.log(`     Errors:   ${result.errors.length}`)
      }
    })
  }

  return allResults
}
