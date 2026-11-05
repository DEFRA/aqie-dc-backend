/**
 * Excel importer (exceljs). Reads a sheet into row objects keyed by the header
 * row, runs the entity transform from entity-config.js and upserts by uniqueKey.
 */

import ExcelJS from 'exceljs'
import { ENTITY_CONFIG } from '../common/helpers/entity-config.js'

const HEADER_ROW = 1

// Plain value for a cell: text/number/boolean as-is (numbers as text), Dates kept, empty as null
function cellValue(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }
  if (value instanceof Date) {
    return value
  }
  if (typeof value === 'object') {
    if (Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('')
    }
    if ('result' in value) {
      return cellValue(value.result)
    }
    if ('text' in value) {
      return cellValue(value.text)
    }
    return null
  }
  return String(value)
}

async function readSheetRows(filePath, sheetName) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(filePath)

  const sheet = workbook.getWorksheet(sheetName)
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found in Excel file`)
  }

  const headers = []
  sheet.getRow(HEADER_ROW).eachCell((cell, column) => {
    headers[column] = String(cellValue(cell.value) ?? '').trim()
  })

  const rows = []
  sheet.eachRow((sheetRow, rowNumber) => {
    if (rowNumber === HEADER_ROW) {
      return
    }

    const row = {}
    let hasValue = false
    headers.forEach((header, column) => {
      if (!header) {
        return
      }
      const value = cellValue(sheetRow.getCell(column).value)
      row[header] = value
      hasValue ||= value !== null
    })

    if (hasValue) {
      rows.push({ row, rowNumber })
    }
  })

  return rows
}

async function importEntity(db, filePath, entityConfig, sheetName, verbose) {
  const { collectionName, transform, uniqueKey } = entityConfig
  const actualSheetName = sheetName || entityConfig.defaultSheetName
  const results = {
    entity: collectionName,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: []
  }

  const rows = await readSheetRows(filePath, actualSheetName)
  if (entityConfig.compareRows) {
    rows.sort((a, b) => entityConfig.compareRows(a.row, b.row))
  }
  if (verbose) {
    console.log(`\n${collectionName}: ${rows.length} rows in "${actualSheetName}"`)
  }

  const collection = db.collection(collectionName)

  // Same scheme as the create flow: next id continues from the last stored one
  const { generateId, idPattern } = entityConfig
  let lastId = null
  if (generateId) {
    const last = await collection.findOne(
      { [uniqueKey]: { $regex: idPattern } },
      { sort: { _id: -1 }, projection: { [uniqueKey]: 1 } }
    )
    lastId = last?.[uniqueKey] ?? null
  }

  for (const { row, rowNumber } of rows) {
    try {
      const document = transform(row)

      if (document === null) {
        console.log(`Skipping TEST record at Excel row ${rowNumber}`)
        results.skipped++
        continue
      }

      const newId = generateId ? generateId(lastId) : null
      if (newId) {
        document[uniqueKey] = newId
      }

      if (!document[uniqueKey]) {
        results.errors.push({ row: rowNumber, error: `Missing ${uniqueKey}` })
        results.skipped++
        continue
      }

      const filter = { [uniqueKey]: document[uniqueKey] }
      const existing = await collection.findOne(filter)

      if (existing) {
        const { createdAt, ...updateDoc } = document
        await collection.updateOne(filter, {
          $set: updateDoc,
          $setOnInsert: { createdAt: existing.createdAt }
        })
        results.updated++
      } else {
        await collection.insertOne(document)
        results.inserted++
      }

      if (newId) {
        lastId = newId
      }
      if (verbose) {
        console.log(`   row ${rowNumber}: ${document[uniqueKey]}`)
      }
    } catch (error) {
      if (error.errInfo?.details) {
        console.log(
          `Validation error for ${collectionName} row ${rowNumber}:`,
          JSON.stringify(error.errInfo.details, null, 2)
        )
      }
      results.errors.push({ row: rowNumber, error: error.message })
      results.skipped++
    }
  }

  return results
}

/**
 * @param {Object} db - MongoDB database instance
 * @param {string} filePath - Path to the .xlsx file
 * @param {Array<{type: string, sheetName?: string}>} entities
 * @param {{verbose?: boolean}} options
 */
export async function importFromExcel(db, filePath, entities, options = {}) {
  const { verbose = false } = options
  const allResults = []

  for (const { type, sheetName } of entities) {
    const entityConfig = ENTITY_CONFIG[type]

    if (!entityConfig) {
      allResults.push({
        entity: type,
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: [{ error: `Unknown entity type: ${type}` }]
      })
      continue
    }

    try {
      allResults.push(
        await importEntity(db, filePath, entityConfig, sheetName, verbose)
      )
    } catch (error) {
      allResults.push({
        entity: entityConfig.collectionName,
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: [{ error: error.message }]
      })
    }
  }

  return allResults
}
