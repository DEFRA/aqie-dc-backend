import { describe, test, expect } from 'vitest'
import { applianceSchema, fuelSchema } from './schema.js'
const TEST_DATE = '2026-02-03'
const TEST_SUBMITTED_DATE = '2026-02-01'
const TEST_MANUFACTURER_ADDRESS = '123 Street'
const TEST_MANUFACTURER_EMAIL = 'john@acme.com'
const TEST_MANUFACTURER_ALT_EMAIL = 'alt@acme.com'
const TEST_INVALID_PHONE_MSG = 'Invalid phone number'

describe('applianceSchema - manufacturerPhone', () => {
  const basePayload = {
    manufacturerName: 'ACME',
    manufacturerAddress: TEST_MANUFACTURER_ADDRESS,
    manufacturerContactName: 'John',
    manufacturerContactEmail: TEST_MANUFACTURER_EMAIL,
    manufacturerAlternateEmail: TEST_MANUFACTURER_ALT_EMAIL,
    manufacturerPhone: undefined,
    modelName: 'X',
    modelNumber: 1,
    applianceType: 'heat',
    isVariant: false,
    nominalOutput: 10,
    multiFuelAppliance: false,
    allowedFuels: 'wood',
    testReport: 'TR',
    technicalDrawings: 'drawing',
    ceMark: 'CE',
    conditionForUse: 'indoor',
    instructionManual: 'manual.pdf',
    instructionManualTitle: 'Manual',
    instructionManualDate: TEST_DATE,
    instructionManualVersion: 'IM-1',
    declaration: true,
    instructionManualAdditionalInfo: 'Extra info',
    airControlModifications: 'Mod info',
    submittedBy: 'Alice',
    approvedBy: 'Bob',
    publishedDate: TEST_DATE,
    submittedDate: TEST_SUBMITTED_DATE,
    technicalApproval: 'Approved',
    walesApproval: 'Approved',
    nIrelandApproval: 'Approved',
    scotlandApproval: 'Approved',
    englandApproval: 'Approved'
  }
  test('valid phone with country code -> normalizes to E164', () => {
    const payload = { ...basePayload, manufacturerPhone: '+44 7405 123456' }
    const { value, error } = applianceSchema.validate(payload)
    expect(error).toBeUndefined()
    expect(value.manufacturerPhone).toMatch(/^\+\d[\d\s-]+$/) // E164 format
    expect(value.manufacturerPhone).not.toBe('+44 111 222 1231') // was transformed
  })
  test('optional phone -> undefined or null passes', () => {
    const payload = { ...basePayload }
    const { value, error } = applianceSchema.validate(payload)
    expect(error).toBeUndefined()
    expect(value.manufacturerPhone).toBeUndefined()
  })
  test('invalid phone (try/catch) -> error', () => {
    const payload = { ...basePayload, manufacturerPhone: 'not-a-phone' }
    const { error } = applianceSchema.validate(payload)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain(TEST_INVALID_PHONE_MSG)
  })
  test('invalid phone format (parse fails) -> catch block', () => {
    const payload = { ...basePayload, manufacturerPhone: '!!!invalid!!!' }
    const { error } = applianceSchema.validate(payload)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain(TEST_INVALID_PHONE_MSG)
  })
  test('phone parses but is not valid (isValidNumber returns false)', () => {
    // This number parses but is not a valid phone number
    // e.g., +44 1234 is not a valid UK number
    const payload = { ...basePayload, manufacturerPhone: '+44 1234' }
    const { error } = applianceSchema.validate(payload)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain(TEST_INVALID_PHONE_MSG)
  })
})
// Fuel schema tests - similar to appliance but with fuel-specific required fields
describe('fuelSchema - manufacturerPhone', () => {
  const baseFuelPayload = {
    manufacturerName: 'FuelCo',
    manufacturerAddress: 'Addr',
    manufacturerContactName: 'Name',
    manufacturerContactEmail: 'a@b.com',
    responsibleName: 'Rep',
    customerComplaints: false,
    qualityControlSystem: 'ISO',
    manufacturerOrReseller: 'Manufacturer',
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
    approvedBy: 'Bob',
    publishedDate: TEST_DATE,
    submittedDate: TEST_SUBMITTED_DATE,
    technicalApproval: 'Approved',
    walesApproval: 'Approved',
    nIrelandApproval: 'Approved',
    scotlandApproval: 'Approved',
    englandApproval: 'Approved'
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
    const payload = { ...baseFuelPayload, manufacturerPhone: '+44 7405334441' }
    const { value, error } = fuelSchema.validate(payload)
    expect(error).toBeUndefined()
    expect(value.manufacturerPhone).not.toBe('+44 222 333 4441') // was transformed
  })
  test('optional phone -> undefined passes', () => {
    const { manufacturerPhone, ...payload } = { ...baseFuelPayload }
    const { value, error } = fuelSchema.validate(payload)
    expect(error).toBeUndefined()
    expect(value.manufacturerPhone).toBeUndefined()
  })
  test('invalid phone (try/catch) -> error', () => {
    const payload = { ...baseFuelPayload, manufacturerPhone: '###bad###' }
    const { error } = fuelSchema.validate(payload)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain(TEST_INVALID_PHONE_MSG)
  })
  test('invalid phone format (parse fails) -> catch block', () => {
    const payload = { ...baseFuelPayload, manufacturerPhone: '!!!invalid!!!' }
    const { error } = fuelSchema.validate(payload)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain(TEST_INVALID_PHONE_MSG)
  })
  test('phone parses but is not valid (isValidNumber returns false)', () => {
    // This number parses but is not a valid phone number
    // e.g., +44 1234 is not a valid UK number
    const payload = { ...baseFuelPayload, manufacturerPhone: '+44 1234' }
    const { error } = fuelSchema.validate(payload)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain(TEST_INVALID_PHONE_MSG)
  })
})
