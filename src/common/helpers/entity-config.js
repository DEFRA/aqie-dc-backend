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

function parseDate(dateString) {
  if (!dateString) return null
  if (dateString instanceof Date) return dateString

  // Try parsing DD/MM/YYYY format
  const parts = dateString.split('/')
  if (parts.length === 3) {
    const [day, month, year] = parts
    const date = new Date(year, month - 1, day)
    if (!isNaN(date.getTime())) return date
  }

  // Fallback to standard parsing
  const date = new Date(dateString)
  return isNaN(date.getTime()) ? null : date
}

/**
 * Transform functions for each entity type
 */
function transformToAppliance(row) {
  // Validate and normalize appliance type
  const rawType = getValueOrDefault(
    row.applianceType,
    row['Appliance Type'],
    'Other'
  )
  const validTypes = ['Stove', 'Boiler', 'Fire', 'Heater', 'Other']
  const applianceType = validTypes.includes(rawType) ? rawType : 'Other'

  const appliance = {
    applianceId: getValueOrDefault(
      row.applianceId,
      row.ApplianceID,
      row.ID,
      ''
    ),
    manufacturer: getValueOrDefault(
      row.manufacturer,
      row.Manufacturer,
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
    modelName: getValueOrDefault(
      row.modelName,
      row['Model Name'],
      'Unknown Model'
    ),
    modelNumber: getValueOrDefault(row.modelNumber, row['Model Number'], 'N/A'),
    applianceType,
    isVariant: parseBoolean(
      getValueOrDefault(row.isVariant, row['Is Variant'])
    ),
    nominalOutput: parseFloat(
      getValueOrDefault(row.nominalOutput, row['Nominal Output (kW)'], 0)
    ),
    allowedFuels: getValueOrDefault(
      row.allowedFuels,
      row['Allowed Fuels'],
      'Not Specified'
    ),
    instructionManualTitle: getValueOrDefault(
      row.instructionManualTitle,
      row['Manual Title'],
      'Not Provided'
    ),
    instructionManualDate:
      parseDate(
        getValueOrDefault(row.instructionManualDate, row['Manual Date'])
      ) || new Date(),
    instructionManualReference: getValueOrDefault(
      row.instructionManualReference,
      row['Manual Reference'],
      'N/A'
    ),
    submittedBy: getValueOrDefault(
      row.submittedBy,
      row['Submitted By'],
      'Unknown'
    ),
    approvedBy: getValueOrDefault(
      row.approvedBy,
      row['Approved By'],
      'Unknown'
    ),
    publishedDate:
      parseDate(getValueOrDefault(row.publishedDate, row['Published Date'])) ||
      new Date(),
    updatedAt: new Date(),
    createdAt: new Date()
  }

  // Optional fields
  const altEmail = getValueOrDefault(
    row.manufacturerAlternateEmail,
    row['Alternate Email']
  )
  if (altEmail) {
    appliance.manufacturerAlternateEmail = altEmail
  }

  const existingAppliance = getValueOrDefault(
    row.existingAuthorisedAppliance,
    row['Existing Appliance']
  )
  if (existingAppliance) {
    appliance.existingAuthorisedAppliance = existingAppliance
  }

  const additionalConds = getValueOrDefault(
    row.additionalConditions,
    row['Additional Conditions']
  )
  if (additionalConds) {
    appliance.additionalConditions = additionalConds
  }

  const fuelsString = getValueOrDefault(
    row.permittedFuels,
    row['Permitted Fuels']
  )
  if (fuelsString) {
    appliance.permittedFuels = fuelsString.split(',').map((f) => f.trim())
  }

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
    fuelDescription: getValueOrDefault(
      row.fuelDescription,
      row['Fuel Description'],
      'No description'
    ),
    fuelWeight: getValueOrDefault(
      row.fuelWeight,
      row['Fuel Weight'],
      'Not Specified'
    ),
    fuelComposition: getValueOrDefault(
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
    fuelDescription: 'Pillow-shaped briquettes with single line indentation',
    fuelWeight: 'Average weight of 125 to 135 grams per briquette',
    fuelComposition: 'Anthracite fines (60% to 80%)',
    sulphurContent: '20',
    manufacturingProcess:
      'Roll pressing and heat treatment at 300 degrees celsius',
    isRebrandedProduct: 'No',
    hasChangedFromOriginal: 'No',
    brandNames: 'Fuel brand 1, Fuel brand 2'
  }
}
