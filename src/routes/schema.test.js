import { describe, test, expect } from 'vitest'
import { applianceSchema, fuelSchema } from './schema.js'
const TEST_DATE = '2026-02-03'
const TEST_SUBMITTED_DATE = '2026-02-01'
const TEST_COMPANY_ADDRESS = '123 Street'
const TEST_COMPANY_EMAIL = 'john@acme.com'
const TEST_COMPANY_ALT_EMAIL = 'alt@acme.com'
const TEST_INVALID_PHONE_MSG = 'Invalid phone number'

describe('applianceSchema - companyPhone', () => {
  const applianceBasePayload = {
    companyName: 'ACME',
    companyAddress: TEST_COMPANY_ADDRESS,
    companyContactName: 'John',
    companyContactEmail: TEST_COMPANY_EMAIL,
    companyAlternateEmail: TEST_COMPANY_ALT_EMAIL,
    companyPhone: undefined,
    modelName: 'X',
    modelNumber: 1,
    applianceType: 'heat',
    isVariant: false,
    existingAuthorisedAppliance: 'Old Model',
    nominalOutput: 10,
    multiFuelAppliance: false,
    allowedFuels: ['Wood Logs', 'Wood Pellets', 'Wood Chips', 'Other'],
    testReport: 'TR',
    technicalDrawings: 'drawing',
    ceMark: 'CE',
    conditionsForUse: 'indoor',
    instructionManual: 'manual.pdf',
    instructionManualTitle: 'Manual',
    instructionManualDate: TEST_DATE,
    instructionManualVersion: 'IM-1',
    instructionManualAdditionalInfo: 'Extra info',
    airControlModifications: 'Mod info',
    declaration: true,
    submittedBy: 'Alice',
    submittedDate: TEST_SUBMITTED_DATE,
    technicalApproval: 'Certified',
    walesApproval: 'Certified',
    nIrelandApproval: 'Certified',
    scotlandApproval: 'Certified',
    englandApproval: 'Certified',
    walesApprovedBy: 'Bob',
    nIrelandApprovedBy: 'Charlie',
    scotlandApprovedBy: 'Dave',
    englandApprovedBy: 'Eve',
    walesDateFirstAuthorised: TEST_DATE,
    nIrelandDateFirstAuthorised: TEST_DATE,
    scotlandDateFirstAuthorised: TEST_DATE,
    englandDateFirstAuthorised: TEST_DATE
  }
  test('valid phone with country code -> normalizes to E164', () => {
    const payload = {
      ...applianceBasePayload,
      companyPhone: '+44 7405 123456'
    }
    const { value, error } = applianceSchema.validate(payload)
    expect(error).toBeUndefined()
    expect(value.companyPhone).toMatch(/^\\+\d[\d\s-]+$/) // E164 format
    expect(value.companyPhone).not.toBe('+44 111 222 1231') // was transformed
  })
  test('optional phone -> undefined or null passes', () => {
    const payload = { ...applianceBasePayload }
    const { value, error } = applianceSchema.validate(payload)
    expect(error).toBeUndefined()
    expect(value.companyPhone).toBeUndefined()
  })
  test('invalid phone (try/catch) -> error', () => {
    const payload = {
      ...applianceBasePayload,
      companyPhone: 'not-a-phone'
    }
    const { error } = applianceSchema.validate(payload)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain(TEST_INVALID_PHONE_MSG)
  })
  test('invalid phone format (parse fails) -> catch block', () => {
    const payload = {
      ...applianceBasePayload,
      companyPhone: '!!!invalid!!!'
    }
    const { error } = applianceSchema.validate(payload)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain(TEST_INVALID_PHONE_MSG)
  })
  test('phone parses but is not valid (isValidNumber returns false)', () => {
    // This number parses but is not a valid phone number
    // e.g., +44 1234 is not a valid UK number
    const payload = { ...applianceBasePayload, companyPhone: '+44 1234' }
    const { error } = applianceSchema.validate(payload)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain(TEST_INVALID_PHONE_MSG)
  })

  test('approvalField empty string -> defaults to Uncertified', () => {
    const payload = { ...applianceBasePayload, technicalApproval: '' }
    const { value, error } = applianceSchema.validate(payload)
    expect(error).toBeUndefined()
    expect(value.technicalApproval).toBe('Uncertified')
  })

  test('approvalField null -> defaults to Uncertified', () => {
    const payload = { ...applianceBasePayload, walesApproval: null }
    const { value, error } = applianceSchema.validate(payload)
    expect(error).toBeUndefined()
    expect(value.walesApproval).toBe('Uncertified')
  })

  test('approvalField omitted -> defaults to Uncertified', () => {
    const { technicalApproval, ...payload } = { ...applianceBasePayload }
    const { value, error } = applianceSchema.validate(payload)
    expect(error).toBeUndefined()
    expect(value.technicalApproval).toBe('Uncertified')
  })

  test('approvalField invalid value -> validation error', () => {
    const payload = {
      ...applianceBasePayload,
      scotlandApproval: 'InvalidValue'
    }
    const { error } = applianceSchema.validate(payload)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain(
      'must be one of [Certified, Revoked, Uncertified]'
    )
  })
})
// Fuel schema tests - similar to appliance but with fuel-specific required fields
describe('fuelSchema - companyPhone', () => {
  const baseFuelPayload = {
    companyName: 'FuelCo',
    companyAddress: 'Addr',
    companyContactName: 'Name',
    companyContactEmail: 'a@b.com',
    companyAlternateEmail: 'alt@b.com',
    companyPhone: '+447537328906',
    responsibleName: 'Rep',
    responsibleEmailAddress: 'rep@b.com',
    customerComplaints: false,
    qualityControlSystem: 'ISO',
    companyOrReseller: 'Manufacturer',
    originalFuelManufacturer: 'OriginalCo',
    originalFuelNameOrBrand: 'BrandX',
    changedFromOriginalFuel: false,
    changesMade: 'The fuel was turned into love hearts',
    fuelBagging: 'Bag',
    baggedAtSource: true,
    fuelDescription: 'Desc',
    fuelWeight: 20,
    fuelComposition: 'Wood',
    sulphurContent: 0.7,
    manufacturingProcess: 'Proc',
    brandNames: 'Brand',
    letterFromManufacturer: 'Letter',
    testReports: 'TR',
    fuelAdditionalDocuments: 'Doc',
    declaration: true,
    submittedBy: 'Alice',
    publishedDate: TEST_DATE,
    submittedDate: TEST_SUBMITTED_DATE,
    technicalApproval: 'Certified',
    walesApproval: 'Certified',
    nIrelandApproval: 'Certified',
    scotlandApproval: 'Certified',
    englandApproval: 'Certified',
    walesApprovedBy: 'Bob',
    nIrelandApprovedBy: 'Charlie',
    scotlandApprovedBy: 'Dave',
    englandApprovedBy: 'Eve',
    walesDateFirstAuthorised: TEST_DATE,
    nIrelandDateFirstAuthorised: TEST_DATE,
    scotlandDateFirstAuthorised: TEST_DATE,
    englandDateFirstAuthorised: TEST_DATE
  }
  test('changesMade field is accepted as string', () => {
    const payload = {
      ...baseFuelPayload,
      changesMade: 'Changed bagging method'
    }
    const { value, error } = fuelSchema.validate(payload)
    expect(error).toBeUndefined()
    expect(value.changesMade).toBe('Changed bagging method')
  })
  test('valid phone with country code -> normalizes to E164', () => {
    const payload = { ...baseFuelPayload, companyPhone: '+44 7405334441' }
    const { value, error } = fuelSchema.validate(payload)
    expect(error).toBeUndefined()
    expect(value.companyPhone).not.toBe('+44 222 333 4441') // was transformed
  })
  test('optional phone -> undefined passes', () => {
    const { companyPhone, ...payload } = { ...baseFuelPayload }
    const { value, error } = fuelSchema.validate(payload)
    expect(error).toBeUndefined()
    expect(value.companyPhone).toBeUndefined()
  })
  test('invalid phone (try/catch) -> error', () => {
    const payload = { ...baseFuelPayload, companyPhone: '###bad###' }
    const { error } = fuelSchema.validate(payload)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain(TEST_INVALID_PHONE_MSG)
  })
  test('invalid phone format (parse fails) -> catch block', () => {
    const payload = { ...baseFuelPayload, companyPhone: '!!!invalid!!!' }
    const { error } = fuelSchema.validate(payload)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain(TEST_INVALID_PHONE_MSG)
  })
  test('phone parses but is not valid (isValidNumber returns false)', () => {
    // This number parses but is not a valid phone number
    // e.g., +44 1234 is not a valid UK number
    const payload = { ...baseFuelPayload, companyPhone: '+44 1234' }
    const { error } = fuelSchema.validate(payload)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain(TEST_INVALID_PHONE_MSG)
  })
})
