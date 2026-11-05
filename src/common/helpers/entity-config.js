/**
 * Entity Configuration
 * Defines all importable entities and their schemas
 */

import { generateSecureId } from './data-transformer.js'

export const ENTITY_TYPES = {
  APPLIANCES: 'appliances',
  FUELS: 'fuels'
}

export const ENTITY_CONFIG = {
  [ENTITY_TYPES.APPLIANCES]: {
    collectionName: 'Appliances',
    defaultSheetName: 'Appliances',
    uniqueKey: 'id',
    transform: transformToAppliance,
    sampleData: getSampleAppliance
  },
  [ENTITY_TYPES.FUELS]: {
    collectionName: 'Fuels',
    defaultSheetName: 'Fuels',
    uniqueKey: 'fuelId',
    transform: transformToFuel,
    sampleData: getSampleFuel
  }
}

/**
 * Helper functions
 */
// Helper to get first non-empty value
function getValueOrDefault(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }
  return values[values.length - 1] // Return last value as default
}

function parseBoolean(value) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === '') return false
    return trimmed.toLowerCase() === 'yes' || trimmed.toLowerCase() === 'true'
  }
  return false
}

// Day-first (UK) formats; each entry lists the capture-group order [year, month, day]
const DATE_PATTERNS = [
  { regex: /^(\d{4})(\d{2})(\d{2})$/, order: [1, 2, 3] },
  { regex: /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/, order: [1, 2, 3] },
  { regex: /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/, order: [3, 2, 1] }
]

const JS_DATE_STRING =
  /^[A-Z][a-z]{2} [A-Z][a-z]{2} \d{2} \d{4} \d{2}:\d{2}:\d{2} GMT[+-]\d{4}/

// Returns an ISO 8601 UTC string (e.g. 2015-10-21T00:00:00.000Z), or null if unparseable
function parseDateToIso(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString()
  }

  const text = String(value ?? '').trim()

  // JS Date.toString() text, e.g. "Sun Jun 01 2025 01:00:00 GMT+0100 (British Summer Time)"
  if (JS_DATE_STRING.test(text)) {
    const parsed = new Date(text)
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
  }

  for (const { regex, order } of DATE_PATTERNS) {
    const match = regex.exec(text)
    if (!match) {
      continue
    }

    const [year, month, day] = order.map((index) => Number(match[index]))
    const date = new Date(Date.UTC(year, month - 1, day))

    // Reject overflowed dates such as 31/02/2015
    const isRealDate =
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day

    return isRealDate ? date.toISOString() : null
  }

  return null
}

function parseDateColumn(row, column) {
  const raw = row[column]
  const iso = parseDateToIso(raw)
  if (raw && !iso) {
    console.warn(`Unrecognised ${column}: "${raw}"`)
  }
  return iso
}

// Each comment starts with a bracketed date/time stamp, e.g. [21/10/2015 14:32]
const COMMENT_START = /(?=\[\s*\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}[^\]\n]*\])/

function splitComments(value) {
  return String(value ?? '')
    .split(COMMENT_START)
    .map((comment) => comment.trim())
    .filter(Boolean)
}

/**
 * Transform functions for each entity type
 */
// Splits a cell of IDs separated by commas, semicolons or line breaks
function splitIds(value) {
  return String(value ?? '')
    .split(/[,;\n]/)
    .map((id) => id.trim())
    .filter(Boolean)
}

function transformToAppliance(row) {
  const modelName = row['Appliance Name (Title)']

  // Returning null tells the importer to skip this record
  if (modelName?.trim().toUpperCase() === 'TEST') {
    return null
  }

  const manualPublicationDate = parseDateColumn(
    row,
    'Instructions Manual Date'
  )
  const servicingPublicationDate = parseDateColumn(row, 'Servicing Manual Date')

  const appliance = {
    //need to correct this when correcting the appliance ID
    id: `APP-${generateSecureId()}`,
    legacy: {
      applianceId: row['Appliance ID'],
      applicationId: row['Application Number'],
      comments: [
        ...splitComments(row['Comments']),
        row['Additional Comments']?.trim()
      ].filter(Boolean),
      linkedApplicationIds: splitIds(row['Linked Applications'])
    },
    modelName,
    modelNumber: null,
    companyName: row['Manufacturer Name'],
    companyFullAddress: row['Manufacturer Address'],
    //Need to come back to after collidate the SQS and appliance application chages
    applianceType: row['Appliance Types'],
    nominalOutput:
      parseFloat(row['Output Value']) === 0 ? null : row['Output Value'],
    //'Fuel types in excel can be ignored'
    // TODO: check how the superscript numbers appear in the Excel source (Unicode characters vs rich-text formatting)
    permittedFuels: row['Permitted Fuels']?.replace(
      /[\u00B2\u00B3\u00B9\u2070\u2074-\u2079]/g,
      ''
    ),
    //to be continued
    additionalConditions: row['Additional Condition Comments'],
    instructionManual: {
      title: row['Instructions Manual Title'],
      version: row['Instructions Manual Reference'],
      publicationDate: manualPublicationDate,
      additionalInfo: row['Additional Comments']
    },
    servicingManual: {
      title: row['Servicing Manual Title'],
      version: row['Servicing Manual Reference'],
      publicationDate: servicingPublicationDate
    },
  
    // isVariant: parseBoolean(
    //   getValueOrDefault(row.isVariant, row['Is Variant'])
    // ),
    // nominalOutput: parseFloat(
    //   getValueOrDefault(row.nominalOutput, row['Nominal Output (kW)'], 0)
    // ),
    // allowedFuels: getValueOrDefault(
    //   row.allowedFuels,
    //   row['Allowed Fuels'],
    //   'Not Specified'
    // ),
    // instructionManualDate:
    //   parseDate(
    //     getValueOrDefault(row.instructionManualDate, row['Manual Date'])
    //   ) || new Date(),
    // submittedBy: getValueOrDefault(
    //   row.submittedBy,
    //   row['Submitted By'],
    //   'Unknown'
    // ),
    // approvedBy: getValueOrDefault(
    //   row.approvedBy,
    //   row['Approved By'],
    //   'Unknown'
    // ),
    // publishedDate:
    //   parseDate(getValueOrDefault(row.publishedDate, row['Published Date'])) ||
    //   new Date(),
    updatedAt: new Date(),
    createdAt: new Date()
  }

  // Optional fields
  // const altEmail = getValueOrDefault(
  //   row.manufacturerAlternateEmail,
  //   row['Alternate Email']
  // )
  // if (altEmail) {
  //   appliance.manufacturerAlternateEmail = altEmail
  // }

  // const existingAppliance = getValueOrDefault(
  //   row.existingAuthorisedAppliance,
  //   row['Existing Appliance']
  // )
  // if (existingAppliance) {
  //   appliance.existingAuthorisedAppliance = existingAppliance
  // }

  return appliance
}

function transformToFuel(row) {
  const fuel = {
    fuelId: getValueOrDefault(row.fuelId, row.FuelID, row.ID, ''),
    manufacturerName: getValueOrDefault(
      row.manufacturerName,
      row['Manufacturer Name'],
      'Unknown'
    ),
    manufacturerAddress: getValueOrDefault(
      row.manufacturerAddress,
      row['Manufacturer Address'],
      'Not Provided'
    ),
    manufacturerContactName: getValueOrDefault(
      row.manufacturerContactName,
      row['Contact Name'],
      'Not Provided'
    ),
    manufacturerContactEmail: getValueOrDefault(
      row.manufacturerContactEmail,
      row['Contact Email'],
      'noemail@example.com'
    ),
    manufacturerPhone: getValueOrDefault(
      row.manufacturerPhone,
      row['Contact Phone'],
      'Not Provided'
    ),
    representativeName: getValueOrDefault(
      row.representativeName,
      row['Representative Name'],
      'Not Provided'
    ),
    representativeEmail: getValueOrDefault(
      row.representativeEmail,
      row['Representative Email'],
      'noemail@example.com'
    ),
    hasCustomerComplaints: parseBoolean(
      getValueOrDefault(row.hasCustomerComplaints, row['Customer Complaints'])
    ),
    qualityControlSystem: getValueOrDefault(
      row.qualityControlSystem,
      row['Quality Control System'],
      'Not Specified'
    ),
    certificationScheme: getValueOrDefault(
      row.certificationScheme,
      row['Certification Scheme'],
      'None'
    ),
    fuelName: getValueOrDefault(row.fuelName, row['Fuel Name'], 'Unknown Fuel'),
    fuelBagging: getValueOrDefault(
      row.fuelBagging,
      row['Fuel Bagging'],
      'Bagged'
    ),
    isBaggedAtSource: parseBoolean(
      getValueOrDefault(row.isBaggedAtSource, row['Bagged at Source'])
    ),
    appearance: getValueOrDefault(
      row.fuelDescription,
      row['Fuel Description'],
      'No description'
    ),
    weight: getValueOrDefault(
      row.fuelWeight,
      row['Fuel Weight'],
      'Not Specified'
    ),
    composition: getValueOrDefault(
      row.fuelComposition,
      row['Fuel Composition'],
      'Not Specified'
    ),
    sulphurContent: parseFloat(
      getValueOrDefault(row.sulphurContent, row['Sulphur Content'], 0)
    ),
    manufacturingProcess: getValueOrDefault(
      row.manufacturingProcess,
      row['Manufacturing Process'],
      'Not Specified'
    ),
    isRebrandedProduct: parseBoolean(
      getValueOrDefault(row.isRebrandedProduct, row['Is Rebranded'])
    ),
    hasChangedFromOriginal: parseBoolean(
      getValueOrDefault(
        row.hasChangedFromOriginal,
        row['Changed from Original']
      )
    ),
    updatedAt: new Date(),
    createdAt: new Date()
  }

  // Optional fields
  const altEmail = getValueOrDefault(
    row.manufacturerAlternateEmail,
    row['Alternate Email']
  )
  if (altEmail) {
    fuel.manufacturerAlternateEmail = altEmail
  }

  const brandsString = getValueOrDefault(row.brandNames, row['Brand Names'])
  if (brandsString) {
    fuel.brandNames = brandsString
  }

  return fuel
}

/**
 * Sample data generators
 */
function getSampleAppliance() {
  return {
    applianceId: 'APP001',
    manufacturer: 'Stoves LTD',
    manufacturerAddress: '24 Bowerfield Lane Newcastle NE638BO',
    manufacturerContactName: 'Joe Bloggs',
    manufacturerContactEmail: 'Joe.bloggs@gmail.com',
    manufacturerAlternateEmail: 'Joe.bloggs2@gmail.com',
    manufacturerPhone: '7846638263',
    modelName: 'Hot Stove 89',
    modelNumber: 'AHS231',
    applianceType: 'Stove',
    isVariant: 'Yes',
    existingAuthorisedAppliance: 'Hot Stove 88',
    nominalOutput: '12',
    allowedFuels: 'Wood Logs, Wood Pellets',
    permittedFuels: 'FUEL001, FUEL002',
    instructionManualTitle: 'Stove manual instructions',
    instructionManualDate: '01/07/2024',
    instructionManualReference: 'Issue 08',
    additionalConditions:
      'Must be fitted with the supplied secondary air control limiters',
    submittedBy: 'Phil Mitchell',
    approvedBy: 'Bruce Lee',
    publishedDate: '04/02/2025'
  }
}

function getSampleFuel() {
  return {
    fuelId: 'FUEL001',
    manufacturerName: 'Fuels Company Ltd',
    manufacturerAddress: '24 Bowerfield Lane Newcastle NE638BO',
    manufacturerContactName: 'Joe Bloggs',
    manufacturerContactEmail: 'Joe.bloggs@gmail.com',
    manufacturerAlternateEmail: 'Joe.bloggs2@gmail.com',
    manufacturerPhone: '7846638263',
    representativeName: 'Simon Gates',
    representativeEmail: 'Simon.Gates@FuelsLTD.com',
    hasCustomerComplaints: 'No',
    qualityControlSystem: 'ISO 9001 certified',
    certificationScheme: 'Fuel authorisation under the Clean Air Act 1993',
    fuelName: 'Eco Briquettes Premium',
    fuelBagging: 'Bagged',
    isBaggedAtSource: 'Yes',
    appearance: 'Pillow-shaped briquettes with single line indentation',
    weight: 'Average weight of 125 to 135 grams per briquette',
    composition: 'Anthracite fines (60% to 80%)',
    sulphurContent: '20',
    manufacturingProcess:
      'Roll pressing and heat treatment at 300 degrees celsius',
    isRebrandedProduct: 'No',
    hasChangedFromOriginal: 'No',
    brandNames: 'Fuel brand 1, Fuel brand 2'
  }
}
