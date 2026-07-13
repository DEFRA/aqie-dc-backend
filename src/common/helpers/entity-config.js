import { parse, isValid } from 'date-fns'
import applianceExample from '../../sample-data/appliance-example.js'
import fuelExample from '../../sample-data/fuel-example.js'

/**
 * Entity Configuration
 * Defines all importable entities and their schemas
 */

export const ENTITY_TYPES = {
  APPLIANCES: 'appliances',
  FUELS: 'fuels'
}

export const ENTITY_CONFIG = {
  [ENTITY_TYPES.APPLIANCES]: {
    collectionName: 'Appliances',
    defaultSheetName: 'Appliances',
    uniqueKey: 'applianceId',
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
 * Transform functions for each entity type
 */
function transformToAppliance(row) {
  // Determine technicalApproval based on Reviewer dates
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
    applicationId: row['Application Number'],
    applianceId: row['Appliance ID'],
    companyName: row['Manufacturer Name'],
    companyAddress: row['Manufacturer Address'],
    modelName: row['Appliance Name (Title)'],
    applianceType: row['Appliance Types'],
    nominalOutput: parseFloat(row['Output Value'] || 0),
    allowedFuels: parseArrayField(row['Permitted Fuels']),
    instructionManualTitle: row['Instructions Manual Title'],
    instructionManualDate: parseDate(row['Instructions Manual Date']),
    instructionManualVersion: row['Instructions Manual Reference'],
    instructionManualAdditionalInfo: row['Additional Comments'],
    airControlModifications: row['Additional Condition Comments'],
    submittedBy: row['Submitted By (User)'],
    submittedDate: parseDate(row['Reviewer Assign Date']),
    publishedDate: parseDate(row['WP Published Date']),
    technicalApproval,
    englandApproval: row['England Status'],
    englandApprovedBy: row['England User'],
    englandDateFirstAuthorised: parseDate(row['England Approve Date']),
    scotlandApproval: row['Scotland Status'],
    scotlandApprovedBy: row['Scotland User'],
    scotlandDateFirstAuthorised: parseDate(row['Scotland Approve Date']),
    walesApproval: row['Wales Status'],
    walesApprovedBy: row['Wales User'],
    walesDateFirstAuthorised: parseDate(row['Wales Approve Date']),
    nIrelandApproval: row['N Ireland Status'],
    nIrelandApprovedBy: row['N Ireland User'],
    nIrelandDateFirstAuthorised: parseDate(row['N Ireland Approve Date']),
    updatedAt: new Date(),
    // Legacy/Additional fields
    linkedApplications: row['Linked Applications'],
    technicalApprovalDate,
    reviewedBy: row['Reviewed By (User)'],
    reviewerAssignDate: parseDate(row['Reviewer Assign Date']),
    additionalConditionComments: row['Additional Condition Comments'],
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
    additionalComments: row['Additional Comments'],
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
  }

  return appliance
}

function transformToFuel(row) {
  const fuel = {
    fuelId: row['Fuel ID'],
    companyName: row['Manufacturer Name'],
    fuelDescription: row['Point C (Manufacturing Process)'],
    fuelWeight: row['Point D (Form Description)'],
    fuelComposition: row['Point A (Fuel Name / Description)'],
    sulphurContent: row['Point E (Unit Weight)'],
    manufacturingProcess: row['Point B (Product Composition)'],
    brandNames: row['Fuel Name (Title)'],
    submittedBy: row['Submitted By (User)'],
    submittedDate: row['Reviewer Assign Date'],
    englandApproval: row['England Status'],
    scotlandApproval: row['N Ireland Status'],
    walesApproval: row['Wales Status'],
    nIrelandApproval: row['Scotland Status'],
    englandApprovedBy: row['England User'],
    scotlandApprovedBy: row['Wales User'],
    walesApprovedBy: row['Scotland User'],
    nIrelandApprovedBy: row['N Ireland User'],
    englandDateFirstAuthorised: row['England Approve Date'],
    scotlandDateFirstAuthorised: row['Scotland Approve Date'],
    walesDateFirstAuthorised: row['Wales Approve Date'],
    nIrelandDateFirstAuthorised: row['N Ireland Approve Date'],
    updatedAt: new Date()
  }

  return fuel
}

/**
 * Sample data generators
 * Returns examples from sample-data folder for tests and API documentation
 */
function getSampleAppliance() {
  return applianceExample
}

function getSampleFuel() {
  return fuelExample
}
