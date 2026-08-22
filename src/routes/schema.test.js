import { describe, test, expect } from 'vitest'
import { applianceSchema, fuelSchema, applicationsSchema } from './schema.js'
import applianceExample from '../sample-data/appliance-example.js'
import fuelExample from '../sample-data/fuel-example.js'
import applicationExample from '../sample-data/application-example.js'

describe('applianceSchema', () => {
  const applianceBasePayload = structuredClone(applianceExample)

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

  test('countryCertification defaults status to new', () => {
    const payload = {
      ...applianceBasePayload,
      walesCertification: {}
    }

    const { value, error } = applianceSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value.walesCertification.status).toBe('new')
  })

  test('invalid certification status returns validation error', () => {
    const payload = {
      ...applianceBasePayload,
      scotlandCertification: {
        status: 'InvalidValue'
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

describe('applicationsSchema - reviewer', () => {
  test('reviewer object is accepted', () => {
    const payload = {
      ...applicationExample,
      reviewer: {
        name: 'John Reviewer',
        email: 'john@reviewer.com'
      }
    }

    const { value, error } = applicationsSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value.reviewer).toEqual({
      name: 'John Reviewer',
      email: 'john@reviewer.com'
    })
  })

  test('reviewer string is rejected because reviewer must be an object or null', () => {
    const payload = {
      ...applicationExample,
      reviewer: 'John Reviewer'
    }

    const { error } = applicationsSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('must be')
  })
})

describe('fuelSchema', () => {
  const baseFuelPayload = structuredClone(fuelExample)

  describe('phone validation', () => {
    test.each([
      '07576796260', // UK
      '+17576796260', // 1 digit country code
      '+447576796260', // 2 digit country code
      '+3537576796260' // 3 digit country code
    ])('valid phone: %s', (phone) => {
      const payload = {
        ...baseFuelPayload,
        companyContact: {
          ...baseFuelPayload.companyContact,
          phone
        }
      }

      const { error } = fuelSchema.validate(payload)

      expect(error).toBeUndefined()
    })

    test.each([
      '0757679626', // UK too short
      '075767962600', // UK too long
      '+7576796260', // no country code
      '+123456789', // too short
      '+1234567890123456', // > 15 digits
      '447576796260', // missing +
      '+44 7576796260', // spaces
      '+44-7576796260', // hyphens
      'abc123',
      'not-a-number'
    ])('invalid phone: %s', (phone) => {
      const payload = {
        ...baseFuelPayload,
        companyContact: {
          ...baseFuelPayload.companyContact,
          phone
        }
      }

      const { error } = fuelSchema.validate(payload)

      expect(error).toBeDefined()
      expect(error.details[0].type).toBe('string.pattern.base')
    })
  })

  test('changesMade field is accepted as string', () => {
    const payload = {
      ...baseFuelPayload,
      changesMade: 'Changed bagging method'
    }

    const { value, error } = fuelSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value.changesMade).toBe('Changed bagging method')
  })

  test('valid phone with country code passes', () => {
    const payload = {
      ...baseFuelPayload,
      companyContact: {
        ...baseFuelPayload.companyContact,
        phone: '+447405334441'
      }
    }

    const { value, error } = fuelSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value.companyContact.phone).toBe('+447405334441')
  })

  test('optional phone -> undefined passes', () => {
    const payload = structuredClone(baseFuelPayload)

    delete payload.companyContact.phone

    const { value, error } = fuelSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value.companyContact.phone).toBeUndefined()
  })

  test('invalid phone -> validation error', () => {
    const payload = {
      ...baseFuelPayload,
      companyContact: {
        ...baseFuelPayload.companyContact,
        phone: '###bad###'
      }
    }

    const { error } = fuelSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].type).toBe('string.pattern.base')
  })

  test('invalid phone format -> validation error', () => {
    const payload = {
      ...baseFuelPayload,
      companyContact: {
        ...baseFuelPayload.companyContact,
        phone: '!!!invalid!!!'
      }
    }

    const { error } = fuelSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].type).toBe('string.pattern.base')
  })

  test('phone longer than allowed length -> validation error', () => {
    const payload = {
      ...baseFuelPayload,
      companyContact: {
        ...baseFuelPayload.companyContact,
        phone: '+12345678901276'
      }
    }

    const { error } = fuelSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].type).toBe('string.pattern.base')
  })

  test('isUkBased false -> companyAddress fields optional', () => {
    const payload = {
      ...baseFuelPayload,
      isUkBased: false,
      companyFullAddress: '789 International Ave'
    }

    delete payload.companyAddress

    const { error } = fuelSchema.validate(payload)

    expect(error).toBeUndefined()
  })

  test('isUkBased false -> companyFullAddress required', () => {
    const payload = {
      ...baseFuelPayload,
      isUkBased: false,
      companyFullAddress: undefined
    }

    const { error } = fuelSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].path).toEqual(['companyFullAddress'])
  })

  test('isUkBased true -> companyAddress.line1 required', () => {
    const payload = {
      ...baseFuelPayload,
      companyAddress: {
        ...baseFuelPayload.companyAddress,
        line1: undefined
      }
    }

    const { error } = fuelSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].path).toEqual(['companyAddress', 'line1'])
  })

  test('isUkBased true -> companyAddress.city required', () => {
    const payload = {
      ...baseFuelPayload,
      companyAddress: {
        ...baseFuelPayload.companyAddress,
        city: undefined
      }
    }

    const { error } = fuelSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].path).toEqual(['companyAddress', 'city'])
  })

  test('isUkBased true -> companyAddress.postcode required', () => {
    const payload = {
      ...baseFuelPayload,
      companyAddress: {
        ...baseFuelPayload.companyAddress,
        postcode: undefined
      }
    }

    const { error } = fuelSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].path).toEqual(['companyAddress', 'postcode'])
  })
})
