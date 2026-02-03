/**
 * Entity Configuration
 * Defines all importable entities and their schemas
 */

export const ENTITY_TYPES = {
  APPLIANCES: 'appliances',
  FUELS: 'fuels',
  USERS: 'users',
  USER_APPLIANCES: 'userAppliances',
  USER_FUELS: 'userFuels'
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
  },
  [ENTITY_TYPES.USERS]: {
    collectionName: 'Users',
    defaultSheetName: 'Users',
    uniqueKey: 'userId',
    transform: transformToUser,
    sampleData: getSampleUser
  },
  [ENTITY_TYPES.USER_APPLIANCES]: {
    collectionName: 'UserAppliances',
    defaultSheetName: 'UserAppliances',
    uniqueKey: null, // Composite key: userId + applianceId
    transform: transformToUserAppliance,
    sampleData: getSampleUserAppliance
  },
  [ENTITY_TYPES.USER_FUELS]: {
    collectionName: 'UserFuels',
    defaultSheetName: 'UserFuels',
    uniqueKey: null, // Composite key: userId + fuelId
    transform: transformToUserFuel,
    sampleData: getSampleUserFuel
  }
}

/**
 * Helper functions
 */
function parseBoolean(value) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    return value.toLowerCase() === 'yes' || value.toLowerCase() === 'true'
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
  const rawType = row.applianceType || row['Appliance Type'] || 'Other'
  const validTypes = ['Stove', 'Boiler', 'Fire', 'Heater', 'Other']
  const applianceType = validTypes.includes(rawType) ? rawType : 'Other'

  const appliance = {
    applianceId: row.applianceId || row.ApplianceID || row.ID || '',
    manufacturer: row.manufacturer || row.Manufacturer || 'Unknown',
    manufacturerAddress:
      row.manufacturerAddress || row['Manufacturer Address'] || 'Not Provided',
    manufacturerContactName:
      row.manufacturerContactName || row['Contact Name'] || 'Not Provided',
    manufacturerContactEmail:
      row.manufacturerContactEmail ||
      row['Contact Email'] ||
      'noemail@example.com',
    manufacturerPhone:
      row.manufacturerPhone || row['Contact Phone'] || 'Not Provided',
    modelName: row.modelName || row['Model Name'] || 'Unknown Model',
    modelNumber: row.modelNumber || row['Model Number'] || 'N/A',
    applianceType,
    isVariant: parseBoolean(row.isVariant || row['Is Variant']),
    nominalOutput: parseFloat(
      row.nominalOutput || row['Nominal Output (kW)'] || 0
    ),
    allowedFuels: row.allowedFuels || row['Allowed Fuels'] || 'Not Specified',
    instructionManualTitle:
      row.instructionManualTitle || row['Manual Title'] || 'Not Provided',
    instructionManualDate:
      parseDate(row.instructionManualDate || row['Manual Date']) || new Date(),
    instructionManualReference:
      row.instructionManualReference || row['Manual Reference'] || 'N/A',
    submittedBy: row.submittedBy || row['Submitted By'] || 'Unknown',
    approvedBy: row.approvedBy || row['Approved By'] || 'Unknown',
    publishedDate:
      parseDate(row.publishedDate || row['Published Date']) || new Date(),
    updatedAt: new Date(),
    createdAt: new Date()
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

  return appliance
}

function transformToFuel(row) {
  const fuel = {
    fuelId: row.fuelId || row.FuelID || row.ID || '',
    manufacturerName:
      row.manufacturerName || row['Manufacturer Name'] || 'Unknown',
    manufacturerAddress:
      row.manufacturerAddress || row['Manufacturer Address'] || 'Not Provided',
    manufacturerContactName:
      row.manufacturerContactName || row['Contact Name'] || 'Not Provided',
    manufacturerContactEmail:
      row.manufacturerContactEmail ||
      row['Contact Email'] ||
      'noemail@example.com',
    manufacturerPhone:
      row.manufacturerPhone || row['Contact Phone'] || 'Not Provided',
    representativeName:
      row.representativeName || row['Representative Name'] || 'Not Provided',
    representativeEmail:
      row.representativeEmail ||
      row['Representative Email'] ||
      'noemail@example.com',
    hasCustomerComplaints: parseBoolean(
      row.hasCustomerComplaints || row['Customer Complaints']
    ),
    qualityControlSystem:
      row.qualityControlSystem ||
      row['Quality Control System'] ||
      'Not Specified',
    certificationScheme:
      row.certificationScheme || row['Certification Scheme'] || 'None',
    fuelName: row.fuelName || row['Fuel Name'] || 'Unknown Fuel',
    fuelBagging: row.fuelBagging || row['Fuel Bagging'] || 'Bagged',
    isBaggedAtSource: parseBoolean(
      row.isBaggedAtSource || row['Bagged at Source']
    ),
    fuelDescription:
      row.fuelDescription || row['Fuel Description'] || 'No description',
    fuelWeight: row.fuelWeight || row['Fuel Weight'] || 'Not Specified',
    fuelComposition:
      row.fuelComposition || row['Fuel Composition'] || 'Not Specified',
    sulphurContent: parseFloat(
      row.sulphurContent || row['Sulphur Content'] || 0
    ),
    manufacturingProcess:
      row.manufacturingProcess ||
      row['Manufacturing Process'] ||
      'Not Specified',
    isRebrandedProduct: parseBoolean(
      row.isRebrandedProduct || row['Is Rebranded']
    ),
    hasChangedFromOriginal: parseBoolean(
      row.hasChangedFromOriginal || row['Changed from Original']
    ),
    updatedAt: new Date(),
    createdAt: new Date()
  }

  // Optional fields
  if (row.manufacturerAlternateEmail || row['Alternate Email']) {
    fuel.manufacturerAlternateEmail =
      row.manufacturerAlternateEmail || row['Alternate Email']
  }

  if (row.brandNames || row['Brand Names']) {
    const brandsString = row.brandNames || row['Brand Names']
    fuel.brandNames = brandsString
      ? brandsString.split(',').map((b) => b.trim())
      : null
  }

  return fuel
}

function transformToUser(row) {
  // Validate and normalize role
  const rawRole = row.role || row.Role || 'user'
  const validRoles = ['admin', 'user', 'manager', 'viewer']
  const role = validRoles.includes(rawRole.toLowerCase())
    ? rawRole.toLowerCase()
    : 'user'

  return {
    userId: row.userId || row.UserID || row.ID || '',
    firstName: row.firstName || row['First Name'] || 'Unknown',
    lastName: row.lastName || row['Last Name'] || 'User',
    email: row.email || row.Email || 'noemail@example.com',
    phone: row.phone || row.Phone || null,
    role,
    organization: row.organization || row.Organization || null,
    address: row.address || row.Address || null,
    city: row.city || row.City || null,
    postcode: row.postcode || row.Postcode || null,
    isActive: parseBoolean(row.isActive || row['Is Active']),
    registrationDate: parseDate(
      row.registrationDate || row['Registration Date']
    ),
    updatedAt: new Date(),
    createdAt: new Date()
  }
}

function transformToUserAppliance(row) {
  return {
    userId: row.userId || row.UserID || row['User ID'],
    applianceId: row.applianceId || row.ApplianceID || row['Appliance ID'],
    assignedDate:
      parseDate(row.assignedDate || row['Assigned Date']) || new Date(),
    status: row.status || row.Status || 'active',
    notes: row.notes || row.Notes || null,
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

function transformToUserFuel(row) {
  return {
    userId: row.userId || row.UserID || row['User ID'],
    fuelId: row.fuelId || row.FuelID || row['Fuel ID'],
    assignedDate:
      parseDate(row.assignedDate || row['Assigned Date']) || new Date(),
    status: row.status || row.Status || 'active',
    notes: row.notes || row.Notes || null,
    createdAt: new Date(),
    updatedAt: new Date()
  }
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

function getSampleUser() {
  return {
    userId: 'USER001',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@example.com',
    phone: '07700900123',
    role: 'admin',
    organization: 'DEFRA',
    address: '123 Main Street',
    city: 'London',
    postcode: 'SW1A 1AA',
    isActive: 'Yes',
    registrationDate: '01/01/2025'
  }
}

function getSampleUserAppliance() {
  return {
    userId: 'USER001',
    applianceId: 'APP001',
    assignedDate: '15/01/2025',
    status: 'active',
    notes: 'Primary heating appliance'
  }
}

function getSampleUserFuel() {
  return {
    userId: 'USER001',
    fuelId: 'FUEL001',
    assignedDate: '15/01/2025',
    status: 'active',
    notes: 'Preferred fuel type'
  }
}
