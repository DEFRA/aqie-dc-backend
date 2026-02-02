/**
 * Dynamic Excel Import Utility
 * Handles importing and updating data from Excel files for any entity type
 * with upsert logic (insert new, update existing)
 */

import xlsx from 'xlsx'
import { ENTITY_CONFIG } from '../common/helpers/entity-config.js'

/**
 * Parse Excel file and return data from a specific sheet
 */
function parseExcelSheet(filePath, sheetName) {
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
      results.errors.push({
        row: i + 2,
        error: error.message
      })
      results.skipped++

      if (verbose) {
        console.log(`   ✗ Error at row ${i + 2}: ${error.message}`)
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
      const result = await importEntity(
        db,
        filePath,
        entityConfig,
        sheetName,
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
