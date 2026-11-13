/**
 * Excel importer (exceljs). Reads a sheet into row objects keyed by the header
 * row, runs the entity transform from entity-config.js and upserts by uniqueKey.
 */

import ExcelJS from 'exceljs'
import { ENTITY_CONFIG } from '../common/helpers/entity-config.js'
// TEMPORARY (mapping report): remove with the block at the end of this file
import { applianceSchema } from '../common/schemas/item-schema.js'

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
    actionsCreated: 0,
    errors: []
  }

  const rows = await readSheetRows(filePath, actualSheetName)
  if (entityConfig.compareRows) {
    rows.sort((a, b) => entityConfig.compareRows(a.row, b.row))
  }
  if (verbose) {
    console.log(
      `\n${collectionName}: ${rows.length} rows in "${actualSheetName}"`
    )
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

  // TEMPORARY: stop appliances import after 150 inserted records; remove with this block
  //const TEMP_INSERT_LIMIT = collectionName === 'Appliances' ? 150 : Infinity

  for (const { row, rowNumber } of rows) {
    // if (results.inserted >= TEMP_INSERT_LIMIT) {
    //   break
    // }
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

        const actions = entityConfig.buildActions?.(row, document) ?? []
        if (actions.length > 0) {
          await db.collection('Actions').insertMany(actions)
          results.actionsCreated += actions.length
        }
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

  // TEMPORARY (mapping report): delete this line with the block at the end of the file
  if (entities.some(({ type }) => type === 'appliances')) {
    await printMappingReport(filePath)
  }

  return allResults
}

// ============================================================================
// TEMPORARY - MAPPING REPORT. Delete everything from this line to the end of the
// file, plus the applianceSchema import at the top and the printMappingReport
// call in importFromExcel, once the migration mapping is finished.
//
// After an appliances import it prints, without touching the database:
//  0. Excel column -> DB field mapping, with the processing applied
//  1. Appliance schema fields the mapping never produces
//  2. Appliance schema fields the mapping only ever sets to null/empty
//  3. Excel columns the mapping never reads
// ============================================================================

// Dotted paths of every leaf in the Joi schema (objects are walked, arrays are leaves)
function schemaPaths(description, prefix = '') {
  return Object.entries(description.keys ?? {}).flatMap(([key, node]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return node.type === 'object' && node.keys
      ? schemaPaths(node, path)
      : [path]
  })
}

// path -> true when the value was ever non-empty
function collectPaths(value, path, found) {
  const isPlainObject =
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !(value instanceof Date)

  if (isPlainObject && Object.keys(value).length > 0) {
    for (const [key, child] of Object.entries(value)) {
      collectPaths(child, path ? `${path}.${key}` : key, found)
    }
    return
  }

  const hasValue =
    value !== null &&
    value !== undefined &&
    !(Array.isArray(value) && value.length === 0) &&
    !isPlainObject
  found.set(path, found.get(path) || hasValue)
}

// Excel column(s) -> Appliances field, plus any processing applied. Keep in sync with
// transformToAppliance / buildApplianceActions in entity-config.js
const COUNTRY_COLUMNS =
  '<Country> Status/User/Assigned Date/Approve Date/Publish Date'
const APPLIANCE_FIELD_MAPPING = [
  [
    'Appliance ID',
    'legacy.applianceId',
    'copied; the new `id` is generated (YYYY-n sequence) in Appliance ID order'
  ],
  ['Application Number', 'legacy.applicationId', 'copied'],
  [
    'Comments, Additional Comments',
    'legacy.comments',
    'Comments split on "[dd/mm/yyyy ...]" stamps into separate entries; Additional Comments appended (trimmed); empties dropped'
  ],
  [
    'Linked Applications',
    'legacy.linkedApplicationIds',
    'split on comma, semicolon or line break; trimmed; empties dropped'
  ],
  [
    'Appliance Name (Title)',
    'modelName',
    'rows named "TEST" are skipped; "(Draft)" appended if any country status is "Draft (10)"'
  ],
  ['(none)', 'modelNumber', 'always null'],
  ['Manufacturer Name', 'companyName', 'copied'],
  ['Manufacturer Address', 'companyFullAddress', 'copied'],
  ['Appliance Types', 'applianceType', 'copied'],
  ['Output Value', 'nominalOutput', 'null when the value is 0'],
  [
    'Permitted Fuels',
    'permittedFuels',
    'superscript digits (e.g. \u00B2) removed'
  ],
  ['Additional Condition Comments', 'additionalConditions', 'copied'],
  ['Instructions Manual Title', 'instructionManual.title', 'copied'],
  ['Instructions Manual Reference', 'instructionManual.version', 'copied'],
  [
    'Instructions Manual Date',
    'instructionManual.publicationDate',
    'date parsed (day-first UK formats) and stored as ISO 8601 UTC; null + warning if unreadable'
  ],
  ['Additional Comments', 'instructionManual.additionalInfo', 'copied'],
  ['Servicing Manual Title', 'servicingManual.title', 'copied'],
  ['Servicing Manual Reference', 'servicingManual.version', 'copied'],
  [
    'Servicing Manual Date',
    'servicingManual.publicationDate',
    'date parsed (day-first UK formats) and stored as ISO 8601 UTC; null + warning if unreadable'
  ],
  [
    COUNTRY_COLUMNS + ' (England, Scotland, Wales, N Ireland)',
    '<country>Certification.{status, decidedAt, decidedBy, firstCertifiedAt, lastCertifiedAt}',
    'Status mapped: Published (600)=certified, Rejected by DA (80)=uncertified, Awaiting Review (20)=awaiting_decision, anything else=new; dates are day-level; Publish Date preferred, Approve Date as fallback for certified; "Name <email>" user split into name/email'
  ],
  [
    'Reviewer Reject/Approve/Assign Date, Reviewed By (User), Submitted By (User)',
    'technicalReview.{status, reviewedAt, reviewedBy}',
    'latest of reject/approve date wins (tie or unreadable = rejected, logged); no review = accepted if certified anywhere, else in_review if assigned, else new'
  ],
  [
    '(derived)',
    'publishedDate',
    'earliest certified date across countries; omitted if none certified'
  ],
  [
    '(derived)',
    'applianceStatus (+ related status fields)',
    'resolved from technicalReview and country certifications using the same rule as the app'
  ],
  [
    '(derived)',
    'isLegacyRecord, createdAt, updatedAt',
    'true / import time / import time'
  ],
  [
    'Reviewer and country columns above',
    'Actions collection',
    'history entries created: rejectedAtApplication, acceptedAtApplication, sentForCertification, certified, uncertified; sorted oldest first'
  ]
]

function printFieldMapping(print) {
  print('\n0. Excel column -> DB field mapping (Appliances):')
  for (const [column, field, note] of APPLIANCE_FIELD_MAPPING) {
    print(`   ${column}  ->  ${field}`)
    print(`      ${note}`)
  }
}

async function printMappingReport(filePath) {
  const { transform, buildActions, defaultSheetName } = ENTITY_CONFIG.appliances
  const rows = await readSheetRows(filePath, defaultSheetName)
  const headers = Object.keys(rows[0]?.row ?? {})

  const readColumns = new Set()
  const produced = new Map()
  const nonEmptyByColumn = Object.fromEntries(headers.map((h) => [h, 0]))
  let mapped = 0

  // The mapping logs per-row messages; keep the report readable
  const { log, warn } = console
  console.log = () => {}
  console.warn = () => {}

  try {
    for (const { row } of rows) {
      for (const header of headers) {
        if (row[header] !== null && String(row[header]).trim() !== '') {
          nonEmptyByColumn[header]++
        }
      }

      // Records every column the mapping reads
      const spy = new Proxy(row, {
        get(target, property) {
          if (typeof property === 'string') {
            readColumns.add(property)
          }
          return target[property]
        }
      })

      const document = transform(spy)
      if (document === null) {
        continue
      }

      mapped++
      // The importer assigns id, so add one here to avoid reporting it as missing
      const withId = { ...document, id: 'assigned-by-importer' }
      buildActions?.(spy, withId)
      collectPaths(withId, '', produced)
    }
  } finally {
    console.log = log
    console.warn = warn
  }

  const allPaths = schemaPaths(applianceSchema.describe())
  const notProduced = allPaths.filter((path) => !produced.has(path))
  const alwaysEmpty = allPaths.filter(
    (path) => produced.has(path) && !produced.get(path)
  )
  const unmapped = headers.filter((header) => !readColumns.has(header))
  const print = (line = '') => process.stdout.write(`${line}\n`)

  print(`\n=== Mapping report (${mapped} appliances mapped) ===`)
  printFieldMapping(print)
  print(
    `\n1. Schema fields never produced by the mapping (${notProduced.length}):`
  )
  notProduced.forEach((path) => print(`   ${path}`))
  print(
    `\n2. Schema fields only ever set to null/empty (${alwaysEmpty.length}):`
  )
  alwaysEmpty.forEach((path) => print(`   ${path}`))
  print(`\n3. Excel columns never read by the mapping (${unmapped.length}):`)
  unmapped.forEach((header) =>
    print(`   ${header}  (${nonEmptyByColumn[header]} rows have a value)`)
  )
  print()
}
