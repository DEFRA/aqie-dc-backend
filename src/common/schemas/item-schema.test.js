import { describe, expect, test } from 'vitest'
import { applianceSchema, fuelSchema } from './item-schema.js'
import applianceExample from '#src/sample-data/appliance-example.js'
import fuelExample from '#src/sample-data/fuel-example.js'

describe('item-schema applianceSchema', () => {
  const applianceBasePayload = structuredClone(applianceExample)

  test('accepts valid appliance payload from sample data', () => {
    const payload = structuredClone(applianceBasePayload)

    const { error } = applianceSchema.validate(payload)

    expect(error).toBeUndefined()
  })

  test('optional phone -> undefined passes', () => {
    const payload = structuredClone(applianceBasePayload)

    delete payload.companyContact.phone

    const { value, error } = applianceSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value.companyContact.phone).toBeUndefined()
  })

  test('valid phone string passes', () => {
    const payload = {
      ...applianceBasePayload,
      companyContact: {
        ...applianceBasePayload.companyContact,
        phone: '07405122344'
      }
    }

    const { value, error } = applianceSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value.companyContact.phone).toBe('07405122344')
  })

  test('non-phone string returns error', () => {
    const payload = {
      ...applianceBasePayload,
      companyContact: {
        ...applianceBasePayload.companyContact,
        phone: 'not-a-phone'
      }
    }

    const { error } = applianceSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].type).toBe('string.pattern.base')
  })

  test('phone longer than allowed length -> validation error', () => {
    const payload = {
      ...applianceBasePayload,
      companyContact: {
        ...applianceBasePayload.companyContact,
        phone: '+12345678901276'
      }
    }

    const { error } = applianceSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].type).toBe('string.pattern.base')
  })

  test('defaults country certification status to new', () => {
    const payload = {
      ...structuredClone(applianceExample),
      englandCertification: {}
    }

    const { value, error } = applianceSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value.englandCertification.status).toBe('new')
  })

  test('rejects invalid country certification status', () => {
    const payload = {
      ...structuredClone(applianceExample),
      walesCertification: {
        status: 'invalid_status'
      }
    }

    const { error } = applianceSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('must be one of')
  })

  test('isUkBased false -> companyAddress fields optional', () => {
    const payload = {
      ...applianceBasePayload,
      isUkBased: false,
      companyFullAddress: '789 International Ave'
    }

    delete payload.companyAddress

    const { error } = applianceSchema.validate(payload)

    expect(error).toBeUndefined()
  })

  test('isUkBased false -> companyFullAddress required', () => {
    const payload = {
      ...applianceBasePayload,
      isUkBased: false,
      companyFullAddress: undefined
    }

    const { error } = applianceSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].path).toEqual(['companyFullAddress'])
  })

  test('isUkBased true -> companyAddress.line1 required', () => {
    const payload = {
      ...applianceBasePayload,
      companyAddress: {
        ...applianceBasePayload.companyAddress,
        line1: undefined
      }
    }

    const { error } = applianceSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].path).toEqual(['companyAddress', 'line1'])
  })

  test('isUkBased true -> companyAddress.city required', () => {
    const payload = {
      ...applianceBasePayload,
      companyAddress: {
        ...applianceBasePayload.companyAddress,
        city: undefined
      }
    }

    const { error } = applianceSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].path).toEqual(['companyAddress', 'city'])
  })

  test('isUkBased true -> companyAddress.postcode required', () => {
    const payload = {
      ...applianceBasePayload,
      companyAddress: {
        ...applianceBasePayload.companyAddress,
        postcode: undefined
      }
    }

    const { error } = applianceSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].path).toEqual(['companyAddress', 'postcode'])
  })
})

describe('item-schema fuelSchema', () => {
  const validFuelPayload = {
    ...structuredClone(fuelExample),
    responsiblePerson: {
      name: fuelExample.responsibleName,
      email: fuelExample.responsibleEmailAddress
    }
  }

  delete validFuelPayload.responsibleName
  delete validFuelPayload.responsibleEmailAddress

  test('accepts valid fuel payload from sample data', () => {
    const payload = structuredClone(validFuelPayload)

    const { error } = fuelSchema.validate(payload)

    expect(error).toBeUndefined()
  })

  test.each(['07576796260', '+17576796260', '+447576796260', '+3537576796260'])(
    'accepts valid phone: %s',
    (phone) => {
      const payload = {
        ...structuredClone(validFuelPayload),
        companyContact: {
          ...validFuelPayload.companyContact,
          phone
        }
      }

      const { error } = fuelSchema.validate(payload)

      expect(error).toBeUndefined()
    }
  )

  test.each([
    '0757679626',
    '075767962600',
    '+7576796260',
    '+123456789',
    '+1234567890123456',
    '447576796260',
    '+44 7576796260',
    '+44-7576796260',
    'abc123',
    'not-a-number'
  ])('rejects invalid phone: %s', (phone) => {
    const payload = {
      ...structuredClone(validFuelPayload),
      companyContact: {
        ...validFuelPayload.companyContact,
        phone
      }
    }

    const { error } = fuelSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].type).toBe('string.pattern.base')
  })

  test('changesMade field is accepted as string', () => {
    const payload = {
      ...structuredClone(validFuelPayload),
      changesMade: 'Changed bagging method'
    }

    const { value, error } = fuelSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value.changesMade).toBe('Changed bagging method')
  })

  test('valid phone with country code passes', () => {
    const payload = {
      ...structuredClone(validFuelPayload),
      companyContact: {
        ...validFuelPayload.companyContact,
        phone: '+447405334441'
      }
    }

    const { value, error } = fuelSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value.companyContact.phone).toBe('+447405334441')
  })

  test('optional phone -> undefined passes', () => {
    const payload = structuredClone(validFuelPayload)

    delete payload.companyContact.phone

    const { value, error } = fuelSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value.companyContact.phone).toBeUndefined()
  })

  test('invalid phone -> validation error', () => {
    const payload = {
      ...structuredClone(validFuelPayload),
      companyContact: {
        ...validFuelPayload.companyContact,
        phone: '###bad###'
      }
    }

    const { error } = fuelSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].type).toBe('string.pattern.base')
  })

  test('invalid phone format -> validation error', () => {
    const payload = {
      ...structuredClone(validFuelPayload),
      companyContact: {
        ...validFuelPayload.companyContact,
        phone: '!!!invalid!!!'
      }
    }

    const { error } = fuelSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].type).toBe('string.pattern.base')
  })

  test('phone longer than allowed length -> validation error', () => {
    const payload = {
      ...structuredClone(validFuelPayload),
      companyContact: {
        ...validFuelPayload.companyContact,
        phone: '+12345678901276'
      }
    }

    const { error } = fuelSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].type).toBe('string.pattern.base')
  })

  test('isUkBased false -> companyAddress fields optional', () => {
    const payload = {
      ...structuredClone(validFuelPayload),
      isUkBased: false,
      companyFullAddress: '789 International Ave'
    }

    delete payload.companyAddress

    const { error } = fuelSchema.validate(payload)

    expect(error).toBeUndefined()
  })

  test('isUkBased false -> companyFullAddress required', () => {
    const payload = {
      ...structuredClone(validFuelPayload),
      isUkBased: false,
      companyFullAddress: undefined
    }

    const { error } = fuelSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].path).toEqual(['companyFullAddress'])
  })

  test('isUkBased true -> companyAddress.line1 required', () => {
    const payload = {
      ...structuredClone(validFuelPayload),
      companyAddress: {
        ...validFuelPayload.companyAddress,
        line1: undefined
      }
    }

    const { error } = fuelSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].path).toEqual(['companyAddress', 'line1'])
  })

  test('isUkBased true -> companyAddress.city required', () => {
    const payload = {
      ...structuredClone(validFuelPayload),
      isUkBased: true,
      companyAddress: {
        uprn: '10012345678',
        line1: '456 Factory Road',
        line2: 'Unit 7',
        city: undefined,
        county: 'West Midlands',
        postcode: 'B1 2AB'
      }
    }

    const { error } = fuelSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].path).toEqual(['companyAddress', 'city'])
  })

  test('isUkBased true -> companyAddress.postcode required', () => {
    const payload = {
      ...structuredClone(validFuelPayload),
      companyAddress: {
        uprn: '10012345678',
        line1: '456 Factory Road',
        line2: 'Unit 7',
        city: 'Liverpool',
        county: 'West Midlands',
        postcode: undefined
      }
    }

    const { error } = fuelSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].path).toEqual(['companyAddress', 'postcode'])
  })
})

describe('applianceSchema - technicalReview checks', () => {
  const basePayload = { ...applianceExample }

  test('defaults every documentation check to null', () => {
    const { value, error } = applianceSchema.validate(basePayload)

    expect(error).toBeUndefined()
    expect(value.technicalReview.documentationChecks).toEqual({
      testReports: null,
      technicalDrawings: null,
      conformityMark: null,
      instructionManual: null
    })
  })

  test('defaults every listing check to null', () => {
    const { value } = applianceSchema.validate(basePayload)

    expect(value.technicalReview.listingChecks).toEqual({
      applianceDetails: null,
      permittedFuels: null,
      additionalConditions: null
    })
  })

  test('accepts a check being set back to null', () => {
    const payload = {
      ...basePayload,
      technicalReview: { documentationChecks: { testReports: null } }
    }

    const { error } = applianceSchema.validate(payload)

    expect(error).toBeUndefined()
  })

  test('accepts a passed and a failed check', () => {
    const payload = {
      ...basePayload,
      technicalReview: {
        documentationChecks: { testReports: true, conformityMark: false }
      }
    }

    const { value, error } = applianceSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value.technicalReview.documentationChecks.testReports).toBe(true)
    expect(value.technicalReview.documentationChecks.conformityMark).toBe(false)
  })

  test('rejects a non-boolean check value', () => {
    const payload = {
      ...basePayload,
      technicalReview: { listingChecks: { permittedFuels: 'maybe' } }
    }

    const { error } = applianceSchema.validate(payload)

    expect(error).toBeDefined()
  })
})
