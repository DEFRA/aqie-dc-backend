import { describe, test, expect } from 'vitest'
import { applianceSchema, fuelSchema } from './schema.js'

describe('schema.js - Phone Validators', () => {
  describe('applianceSchema - manufacturerPhone', () => {
    test('valid phone with country code -> normalizes to E164', () => {
      const payload = {
        permittedFuels: 'wood',
        manufacturer: 'ACME',
        manufacturerAddress: '123 Street',
        manufacturerContactName: 'John',
        manufacturerContactEmail: 'john@acme.com',
        manufacturerAlternateContactEmail: 'alt@acme.com',
        manufacturerPhone: '+44 7405 123456',
        modelName: 'X',
        modelNumber: 1,
        applianceType: 'heat',
        isVariant: false,
        nominalOutput: 10,
        allowedFuels: 'wood',
        testReport: 'TR',
        technicalDrawings: 'drawing',
        ceMark: 'CE',
        conditionForUse: 'indoor',
        instructionManualTitle: 'Manual',
        instructionManualDate: '2026-02-03',
        instructionManualReference: 'IM-1',
        submittedBy: 'Alice',
        approvedBy: 'Bob',
        publishedDate: '2026-02-03'
      }

      const { value, error } = applianceSchema.validate(payload)
      expect(error).toBeUndefined()
      expect(value.manufacturerPhone).toMatch(/^\+\d[\d\s-]+$/) // E164 format
      expect(value.manufacturerPhone).not.toBe('+44 111 222 1231') // was transformed
    })

    test('optional phone -> undefined or null passes', () => {
      const payload = {
        permittedFuels: 'wood',
        manufacturer: 'ACME',
        manufacturerAddress: '123 Street',
        manufacturerContactName: 'John',
        manufacturerContactEmail: 'john@acme.com',
        manufacturerAlternateContactEmail: 'alt@acme.com',
        // manufacturerPhone omitted
        modelName: 'X',
        modelNumber: 1,
        applianceType: 'heat',
        isVariant: false,
        nominalOutput: 10,
        allowedFuels: 'wood',
        testReport: 'TR',
        technicalDrawings: 'drawing',
        ceMark: 'CE',
        conditionForUse: 'indoor',
        instructionManualTitle: 'Manual',
        instructionManualDate: '2026-02-03',
        instructionManualReference: 'IM-1',
        submittedBy: 'Alice',
        approvedBy: 'Bob',
        publishedDate: '2026-02-03'
      }

      const { value, error } = applianceSchema.validate(payload)
      expect(error).toBeUndefined()
      // optional phone field should be undefined
      expect(value.manufacturerPhone).toBeUndefined()
    })

    test('invalid phone (try/catch) -> error', () => {
      const payload = {
        permittedFuels: 'wood',
        manufacturer: 'ACME',
        manufacturerAddress: '123 Street',
        manufacturerContactName: 'John',
        manufacturerContactEmail: 'john@acme.com',
        manufacturerAlternateContactEmail: 'alt@acme.com',
        manufacturerPhone: 'not-a-phone',
        modelName: 'X',
        modelNumber: 1,
        applianceType: 'heat',
        isVariant: false,
        nominalOutput: 10,
        allowedFuels: 'wood',
        testReport: 'TR',
        technicalDrawings: 'drawing',
        ceMark: 'CE',
        conditionForUse: 'indoor',
        instructionManualTitle: 'Manual',
        instructionManualDate: '2026-02-03',
        instructionManualReference: 'IM-1',
        submittedBy: 'Alice',
        approvedBy: 'Bob',
        publishedDate: '2026-02-03'
      }

      const { error } = applianceSchema.validate(payload)
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain('Invalid phone number')
    })

    test('invalid phone format (parse fails) -> catch block', () => {
      const payload = {
        permittedFuels: 'wood',
        manufacturer: 'ACME',
        manufacturerAddress: '123 Street',
        manufacturerContactName: 'John',
        manufacturerContactEmail: 'john@acme.com',
        manufacturerAlternateContactEmail: 'alt@acme.com',
        manufacturerPhone: '!!!invalid!!!',
        modelName: 'X',
        modelNumber: 1,
        applianceType: 'heat',
        isVariant: false,
        nominalOutput: 10,
        allowedFuels: 'wood',
        testReport: 'TR',
        technicalDrawings: 'drawing',
        ceMark: 'CE',
        conditionForUse: 'indoor',
        instructionManualTitle: 'Manual',
        instructionManualDate: '2026-02-03',
        instructionManualReference: 'IM-1',
        submittedBy: 'Alice',
        approvedBy: 'Bob',
        publishedDate: '2026-02-03'
      }

      const { error } = applianceSchema.validate(payload)
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain('Invalid phone number')
    })
  })

  describe('fuelSchema - manufacturerPhone', () => {
    const validFuelPayload = {
      manufacturer: 'FuelCo',
      manufacturerAddress: 'Addr',
      manufacturerContactName: 'Name',
      manufacturerContactEmail: 'a@b.com',
      manufacturerAlternateContactEmail: 'b@c.com',
      representativeName: 'Rep',
      representativeEmailAddress: 'rep@co.com',
      customerComplaints: false,
      qualityControlSystem: 'ISO',
      certificationScheme: 'Scheme',
      fuelName: 'Pellets',
      fuelBagging: 'Bag',
      baggedAtSource: true,
      fuelDescription: 'Desc',
      fuelWeight: 20,
      fuelComposition: 'Wood',
      sulphurContent: 0.7,
      manufacturingProcess: 'Proc',
      rebrandedProduct: false,
      changedFromOriginalFuel: false,
      brandNames: 'Brand',
      testReports: 'TR',
      fuelAdditionalDocuments: 'Doc'
    }

    test('valid phone with country code -> normalizes to E164', () => {
      const payload = {
        manufacturer: 'FuelCo',
        manufacturerAddress: 'Addr',
        manufacturerContactName: 'Name',
        manufacturerContactEmail: 'a@b.com',
        manufacturerAlternateContactEmail: 'b@c.com',
        representativeName: 'Rep',
        representativeEmailAddress: 'rep@co.com',
        customerComplaints: false,
        qualityControlSystem: 'ISO',
        certificationScheme: 'Scheme',
        fuelName: 'Pellets',
        fuelBagging: 'Bag',
        baggedAtSource: true,
        fuelDescription: 'Desc',
        fuelWeight: 20,
        fuelComposition: 'Wood',
        sulphurContent: 0.7,
        manufacturingProcess: 'Proc',
        rebrandedProduct: false,
        changedFromOriginalFuel: false,
        brandNames: 'Brand',
        testReports: 'TR',
        fuelAdditionalDocuments: 'Doc',
        manufacturerPhone: '+44 7405334441'
      }

      const { value, error } = fuelSchema.validate(payload)
      expect(error).toBeUndefined()
      expect(value.manufacturerPhone).toMatch(/^\+\d[\d\s-]+$/) // E164 format
      expect(value.manufacturerPhone).not.toBe('+44 222 333 4441') // was transformed
    })

    test('optional phone -> undefined passes', () => {
      const payload = { ...validFuelPayload }
      // manufacturerPhone omitted

      const { value, error } = fuelSchema.validate(payload)
      expect(error).toBeUndefined()
      expect(value.manufacturerPhone).toBeUndefined()
    })

    test('invalid phone (try/catch) -> error', () => {
      const payload = {
        ...validFuelPayload,
        manufacturerPhone: 'bad-phone'
      }

      const { error } = fuelSchema.validate(payload)
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain('Invalid phone number')
    })

    test('invalid phone format (parse fails) -> catch block', () => {
      const payload = {
        ...validFuelPayload,
        manufacturerPhone: '###bad###'
      }

      const { error } = fuelSchema.validate(payload)
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain('Invalid phone number')
    })
  })
})
