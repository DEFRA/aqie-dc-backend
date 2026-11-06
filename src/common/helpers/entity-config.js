/**
 * Entity Configuration
 * Defines all importable entities and their schemas
 */

import { generateNextId, generateSecureId } from './data-transformer.js'
import { actionWording } from '../schemas/action-schema.js'
import { resolveStatusUpdate } from './item-status.js'

export const ENTITY_TYPES = {
  APPLIANCES: 'appliances',
  FUELS: 'fuels'
}

export const ENTITY_CONFIG = {
  [ENTITY_TYPES.APPLIANCES]: {
    collectionName: 'Appliances',
    defaultSheetName: 'Appliances',
    uniqueKey: 'id',
    // The importer assigns id in sheet order, continuing the sequence from the last existing id
    generateId: generateNextId,
    idPattern: /^\d{4}-\d+$/,
    compareRows: compareByApplianceId,
    transform: transformToAppliance,
    buildActions: buildApplianceActions,
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
  {
    regex: /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/,
    order: [1, 2, 3]
  },
  {
    regex: /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:[T\s].*)?$/,
    order: [3, 2, 1]
  }
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

// Ascending by Appliance ID; numeric IDs first, then any non-numeric ones as text
function compareByApplianceId(rowA, rowB) {
  const idA = String(rowA['Appliance ID'] ?? '').trim()
  const idB = String(rowB['Appliance ID'] ?? '').trim()
  const numA = Number(idA)
  const numB = Number(idB)
  const isNumA = idA !== '' && !Number.isNaN(numA)
  const isNumB = idB !== '' && !Number.isNaN(numB)

  if (isNumA && isNumB) {
    return numA - numB
  }
  if (isNumA !== isNumB) {
    return isNumA ? -1 : 1
  }
  return idA.localeCompare(idB)
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
  let modelName = row['Appliance Name (Title)']

  // Returning null tells the importer to skip this record
  if (modelName?.trim().toUpperCase() === 'TEST') {
    return null
  }

  const manualPublicationDate = parseDateColumn(row, 'Instructions Manual Date')
  const servicingPublicationDate = parseDateColumn(row, 'Servicing Manual Date')
  const certifications = buildCertifications(row)

  // Add "(Draft)" suffix if any country has draft status
  const hasDraft = COUNTRIES.some(
    (country) =>
      String(row[`${country.prefix} Status`] ?? '').trim() === 'Draft (10)'
  )
  if (hasDraft) {
    modelName = `${modelName} (Draft)`
  }

  const appliance = {
    isLegacyRecord: true,
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

    ...certifications,
    technicalReview: buildTechnicalReview(row, certifications),
    // Earliest certification date across the countries; omitted when none is certified
    ...(earliestCertifiedDate(certifications) && {
      publishedDate: earliestCertifiedDate(certifications)
    }),
    updatedAt: new Date(),
    createdAt: new Date()
  }

  // Same rule the app uses after a review or certification change
  Object.assign(
    appliance,
    resolveStatusUpdate(
      appliance,
      'applianceStatus',
      appliance.technicalReview.status
    )
  )

  return appliance
}

const hasValue = (value) => String(value ?? '').trim() !== ''

// Day-level date (time dropped) as a Date at midnight UTC; null if absent or unreadable
function parseActionDate(row, column) {
  const iso = parseDateColumn(row, column)
  return iso ? new Date(iso.slice(0, 10)) : null
}

// Legacy user cell such as "Name <name@example.com>" as { name, email }; null when empty
function parseLegacyUser(value) {
  const text = String(value ?? '').trim()
  if (!text) {
    return null
  }

  const match = /^(.*?)\s*<([^<>\s]+@[^<>\s]+)>$/.exec(text)
  if (!match) {
    return { name: text }
  }
  return { name: match[1].trim() || match[2], email: match[2] }
}

// Reviewer, else the submitter; null when neither is given
function legacyActor(row) {
  const user =
    parseLegacyUser(row['Reviewed By (User)']) ??
    parseLegacyUser(row['Submitted By (User)'])

  return user ? { ...user, type: 'user' } : null
}

const COUNTRIES = [
  {
    field: 'englandCertification',
    prefix: 'England',
    slug: 'england',
    label: 'England'
  },
  {
    field: 'scotlandCertification',
    prefix: 'Scotland',
    slug: 'scotland',
    label: 'Scotland'
  },
  {
    field: 'walesCertification',
    prefix: 'Wales',
    slug: 'wales',
    label: 'Wales'
  },
  {
    field: 'nIrelandCertification',
    prefix: 'N Ireland',
    slug: 'northern-ireland',
    label: 'Northern Ireland'
  }
]

// TODO come back to this: 'Draft (10)', empty and any other status are all saved as 'new'
const COUNTRY_STATUSES = {
  'Published (600)': 'certified',
  'Rejected by DA (80)': 'uncertified',
  'Awaiting Review (20)': 'awaiting_decision'
}

function countryStatus(row, country) {
  return (
    COUNTRY_STATUSES[String(row[`${country.prefix} Status`] ?? '').trim()] ??
    'new'
  )
}

// Certification object for one country, built from its Status/User/Publish/Approve columns
function buildCertification(row, country) {
  const status = countryStatus(row, country)
  const publishDate = parseActionDate(row, `${country.prefix} Publish Date`)
  const approveDate = parseActionDate(row, `${country.prefix} Approve Date`)
  const certifiedDate = publishDate ?? approveDate
  const isDecided = status === 'certified' || status === 'uncertified'

  return {
    status,
    // Uncertified ('Rejected by DA (80)') has no reject-date column, so decidedAt and the
    // 'Uncertified in X' action date use the country's Publish Date only. No fallback to
    // Approve/Assigned Date; when Publish Date is empty it stays null and
    // buildCountryActions logs the row with those dates so you can choose.
    decidedAt:
      status === 'certified'
        ? certifiedDate
        : status === 'uncertified'
          ? publishDate
          : null,
    decidedBy: isDecided
      ? parseLegacyUser(row[`${country.prefix} User`])
      : null,
    firstCertifiedAt: certifiedDate,
    lastCertifiedAt: certifiedDate
  }
}

// Earliest firstCertifiedAt among the countries that are certified; null when there is none
function earliestCertifiedDate(certifications) {
  const dates = Object.values(certifications)
    .filter((certification) => certification.status === 'certified')
    .map((certification) => certification.firstCertifiedAt)
    .filter(Boolean)

  return dates.length > 0 ? new Date(Math.min(...dates)) : null
}

function buildCertifications(row) {
  return Object.fromEntries(
    COUNTRIES.map((country) => [
      country.field,
      buildCertification(row, country)
    ])
  )
}

function actionEntry(itemId, action, completedBy, completedAt, country) {
  return {
    id: `ACT-${generateSecureId()}`,
    itemId,
    itemType: 'appliance',
    action,
    description: actionWording[action](country?.label),
    ...(country && { country: country.slug }),
    completedBy,
    completedAt
  }
}

// Raw cell for a console message: dates as YYYY-MM-DD, empty as 'none'
function showCell(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? 'invalid'
      : value.toISOString().slice(0, 10)
  }
  return hasValue(value) ? String(value).trim() : 'none'
}

function countryDatesText(row, country) {
  return (
    `Assigned Date: ${showCell(row[`${country.prefix} Assigned Date`])}, ` +
    `Approve Date: ${showCell(row[`${country.prefix} Approve Date`])}, ` +
    `Publish Date: ${showCell(row[`${country.prefix} Publish Date`])}`
  )
}

// Country actions: sent for certification, then certified or uncertified.
// Draft ('Draft (10)') rows get no certified/uncertified entry; they are saved as 'new' and logged.
function buildCountryActions(row, appliance) {
  const reviewer = legacyActor(row)
  const actions = []

  for (const country of COUNTRIES) {
    const certification = appliance[country.field]

    if (String(row[`${country.prefix} Status`] ?? '').trim() === 'Draft (10)') {
      console.log(
        `${country.label} is a draft for legacy appliance ${row['Appliance ID']}. ${countryDatesText(row, country)}`
      )
    }

    if (hasValue(row[`${country.prefix} Assigned Date`])) {
      actions.push(
        actionEntry(
          appliance.id,
          'sentForCertification',
          reviewer,
          parseActionDate(row, `${country.prefix} Assigned Date`),
          country
        )
      )
    }

    const decidedBy = certification.decidedBy && {
      ...certification.decidedBy,
      type: 'user'
    }

    if (certification.status === 'certified') {
      actions.push(
        actionEntry(
          appliance.id,
          'certified',
          decidedBy,
          certification.firstCertifiedAt,
          country
        )
      )
    }

    if (certification.status === 'uncertified') {
      // Date is the country Publish Date only (see buildCertification); the question below
      // is for you to answer when it is missing. Approve/Assigned Date are shown for reference.
      if (!certification.decidedAt) {
        console.log(
          `${country.label} reject date doesn't exist for legacy appliance ${row['Appliance ID']}: do you mean the approve or assigned date? ` +
            countryDatesText(row, country)
        )
      }
      actions.push(
        actionEntry(
          appliance.id,
          'uncertified',
          decidedBy,
          certification.decidedAt,
          country
        )
      )
    }
  }

  return actions
}

// Action history entries for a migrated appliance, in the order they should be inserted.
// Unreadable dates are kept as null so the appliance and its history still import.
function buildApplianceActions(row, appliance) {
  const { rejected, accepted } = reviewEntries(row)
  const actions = []

  // TODO double check: the spec only asks for 'Rejected at application' when an approve date
  // also exists; it is created for a reject date on its own too.
  if (rejected) {
    actions.push(
      actionEntry(
        appliance.id,
        'rejectedAtApplication',
        rejected.completedBy,
        rejected.completedAt
      )
    )
  }

  if (accepted) {
    actions.push(
      actionEntry(
        appliance.id,
        'acceptedAtApplication',
        accepted.completedBy,
        accepted.completedAt
      )
    )
  }

  return sortActionsByDate([...actions, ...buildCountryActions(row, appliance)])
}

// Rejected/Accepted at application from the Reviewer columns; parsed once per row so the
// actions and technicalReview agree and date warnings are not repeated.
const reviewCache = new WeakMap()

function reviewEntries(row) {
  if (reviewCache.has(row)) {
    return reviewCache.get(row)
  }

  const completedBy = legacyActor(row)
  let rejected = null
  let accepted = null

  if (hasValue(row['Reviewer Reject Date'])) {
    rejected = {
      completedBy,
      completedAt: parseActionDate(row, 'Reviewer Reject Date')
    }
  }

  if (hasValue(row['Reviewer Approve Date'])) {
    accepted = {
      completedBy,
      completedAt: parseActionDate(row, 'Reviewer Approve Date')
    }
  } else if (String(row['England Status'] ?? '').trim() === 'Published (600)') {
    accepted = {
      completedBy,
      completedAt: parseActionDate(row, 'England Assigned Date')
    }
  }

  const entries = { rejected, accepted }
  reviewCache.set(row, entries)
  return entries
}

const toReviewedBy = (actor) =>
  actor
    ? { name: actor.name, ...(actor.email && { email: actor.email }) }
    : null

// technicalReview is the latest of the Rejected/Accepted entries, by date.
// Rejected and Accepted on the same day (or with an unreadable date) cannot be told apart:
// 'rejected' is used and the row is logged.
// No review entry: 'accepted' if certified in any country (earliest certification date),
// else 'in_review' when a Reviewer Assign Date exists, else 'new'.
function buildTechnicalReview(row, certifications) {
  const { rejected, accepted } = reviewEntries(row)
  const review = (status, entry) => ({
    status,
    reviewedAt: entry?.completedAt ?? null,
    reviewedBy: toReviewedBy(entry?.completedBy)
  })

  if (rejected && accepted) {
    const isClear =
      rejected.completedAt &&
      accepted.completedAt &&
      +rejected.completedAt !== +accepted.completedAt

    if (!isClear) {
      console.log(
        `Confusion about whether the review is accepted or rejected for legacy appliance ${row['Appliance ID']}: ` +
          `Reviewer Reject Date ${showCell(row['Reviewer Reject Date'])}, ` +
          `Reviewer Approve Date ${showCell(row['Reviewer Approve Date'])}; using rejected`
      )
      return review('rejected', rejected)
    }

    return rejected.completedAt > accepted.completedAt
      ? review('rejected', rejected)
      : review('accepted', accepted)
  }

  if (rejected) {
    return review('rejected', rejected)
  }
  if (accepted) {
    return review('accepted', accepted)
  }

  const hasCertified = Object.values(certifications).some(
    (certification) => certification.status === 'certified'
  )

  if (hasCertified) {
    return {
      status: 'accepted',
      reviewedAt: earliestCertifiedDate(certifications),
      reviewedBy: null
    }
  }

  return {
    status: hasValue(row['Reviewer Assign Date']) ? 'in_review' : 'new',
    reviewedAt: null,
    reviewedBy: null
  }
}

// Same-day entries keep the natural order of the process
const ACTION_ORDER = [
  'rejectedAtApplication',
  'acceptedAtApplication',
  'sentForCertification',
  'certified',
  'uncertified'
]

// Oldest first so insertion order follows the dates; undated entries go last
function sortActionsByDate(actions) {
  return [...actions].sort((a, b) => {
    if (a.completedAt === null || b.completedAt === null) {
      return (a.completedAt === null) - (b.completedAt === null)
    }
    return (
      a.completedAt - b.completedAt ||
      ACTION_ORDER.indexOf(a.action) - ACTION_ORDER.indexOf(b.action)
    )
  })
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
