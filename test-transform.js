import { ENTITY_CONFIG } from './src/common/helpers/entity-config.js'

// Simulate empty Excel row (all empty strings)
const emptyRow = {
  fuelId: 'TEST123'
  // All other fields will be undefined or empty strings
}

const result = ENTITY_CONFIG.fuels.transform(emptyRow)
console.log('Transformed fuel with empty data:')
console.log(JSON.stringify(result, null, 2))

// Check all required fields are present
const requiredFields = [
  'fuelId',
  'manufacturerName',
  'manufacturerAddress',
  'manufacturerContactName',
  'manufacturerContactEmail',
  'manufacturerPhone',
  'representativeName',
  'representativeEmail',
  'hasCustomerComplaints',
  'qualityControlSystem',
  'certificationScheme',
  'fuelName',
  'fuelBagging',
  'isBaggedAtSource',
  'fuelDescription',
  'fuelWeight',
  'fuelComposition',
  'sulphurContent',
  'manufacturingProcess',
  'isRebrandedProduct',
  'hasChangedFromOriginal'
]

console.log('\nRequired fields check:')
requiredFields.forEach((field) => {
  const value = result[field]
  const hasValue = value !== undefined && value !== null && value !== ''
  console.log(`${field}: ${hasValue ? '✓' : '✗'} (${JSON.stringify(value)})`)
})
