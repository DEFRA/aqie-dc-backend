import { describe, expect, test } from 'vitest'
import { applianceSchema, fuelSchema } from './item-schema.js'
import applianceExample from '../../sample-data/appliance-example.js'
import fuelExample from '../../sample-data/fuel-example.js'

describe('item-schema applianceSchema', () => {
  test('accepts valid appliance payload from sample data', () => {
    const payload = structuredClone(applianceExample)

    const { error } = applianceSchema.validate(payload)

    expect(error).toBeUndefined()
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

  test('accepts valid company phone values', () => {
    const payload = {
      ...structuredClone(validFuelPayload),
      companyContact: {
        ...validFuelPayload.companyContact,
        phone: '+447576796260'
      }
    }

    const { error } = fuelSchema.validate(payload)

    expect(error).toBeUndefined()
  })

  test('rejects invalid company phone values', () => {
    const payload = {
      ...structuredClone(validFuelPayload),
      companyContact: {
        ...validFuelPayload.companyContact,
        phone: 'invalid-phone'
      }
    }

    const { error } = fuelSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].type).toBe('string.pattern.base')
  })
})
