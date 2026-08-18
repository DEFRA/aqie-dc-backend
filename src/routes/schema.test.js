import { describe, test, expect } from 'vitest'
import { applianceSchema, fuelSchema, applicationsSchema } from './schema.js'
import applianceExample from '../sample-data/appliance-example.js'
import fuelExample from '../sample-data/fuel-example.js'
import applicationExample from '../sample-data/application-example.js'

const TEST_INVALID_PHONE_MSG = 'Invalid phone number'

describe('applianceSchema - companyPhone', () => {
  const applianceBasePayload = {
    ...applianceExample,
    companyPhone: undefined
  }

  test('optional phone -> undefined or null passes', () => {
    const payload = { ...applianceBasePayload }
    const { value, error } = applianceSchema.validate(payload)
    expect(error).toBeUndefined()
    expect(value.companyPhone).toBeUndefined()
  })

  test('valid phone string passes', () => {
    const payload = {
      ...applianceBasePayload,
      companyPhone: '07405123456'
    }

    const { value, error } = applianceSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value.companyPhone).toBe('07405123456')
  })

  test('optional phone -> undefined passes', () => {
    const payload = { ...applianceBasePayload }

    const { value, error } = applianceSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value.companyPhone).toBeUndefined()
  })

  test('non-phone string returns error', () => {
    const payload = {
      ...applianceBasePayload,
      companyPhone: 'not-a-phone'
    }

    const { error } = applianceSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].type).toBe('string.pattern.base')
  })

  test('phone longer than 11 digits -> error', () => {
    const payload = {
      ...applianceBasePayload,
      companyPhone: '+123456789012'
    }

    const { error } = applianceSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].type).toBe('string.pattern.base')
  })

  test('approvalField empty string -> defaults to Uncertified', () => {
    const payload = { ...applianceBasePayload, walesApproval: '' }
    const { value, error } = applianceSchema.validate(payload)
    expect(error).toBeUndefined()
    expect(value.walesApproval).toBe('Uncertified')
  })

  test('approvalField null -> defaults to Uncertified', () => {
    const payload = { ...applianceBasePayload, walesApproval: null }
    const { value, error } = applianceSchema.validate(payload)
    expect(error).toBeUndefined()
    expect(value.walesApproval).toBe('Uncertified')
  })

  test('approvalField omitted -> defaults to Uncertified', () => {
    const { walesApproval, ...payload } = { ...applianceBasePayload }
    const { value, error } = applianceSchema.validate(payload)
    expect(error).toBeUndefined()
    expect(value.walesApproval).toBe('Uncertified')
  })

  test('approvalField invalid value -> validation error', () => {
    const payload = {
      ...applianceBasePayload,
      scotlandApproval: 'InvalidValue'
    }
    const { error } = applianceSchema.validate(payload)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('must be one of')
  })

  test('isUkBased false -> address fields optional', () => {
    const {
      companyAddressLine1,
      companyAddressCity,
      companyAddressPostcode,
      ...rest
    } = applianceBasePayload
    const payload = { ...rest, isUkBased: false }
    const { error } = applianceSchema.validate(payload)
    expect(error).toBeUndefined()
  })

  test('isUkBased true -> companyAddressLine1 required', () => {
    const { companyAddressLine1, ...payload } = applianceBasePayload
    const { error } = applianceSchema.validate(payload)
    expect(error).toBeDefined()
    expect(error.details[0].path).toContain('companyAddressLine1')
  })

  test('isUkBased true -> companyAddressCity required', () => {
    const { companyAddressCity, ...payload } = applianceBasePayload
    const { error } = applianceSchema.validate(payload)
    expect(error).toBeDefined()
    expect(error.details[0].path).toContain('companyAddressCity')
  })

  test('isUkBased true -> companyAddressPostcode required', () => {
    const { companyAddressPostcode, ...payload } = applianceBasePayload
    const { error } = applianceSchema.validate(payload)
    expect(error).toBeDefined()
    expect(error.details[0].path).toContain('companyAddressPostcode')
  })
})

describe('applianceSchema - technicalReview', () => {
  const applianceBasePayload = {
    ...applianceExample,
    companyPhone: undefined
  }

  test('technicalReview omitted -> valid and remains undefined', () => {
    const { technicalReview, ...payload } = applianceBasePayload

    const { value, error } = applianceSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value.technicalReview).toBeUndefined()
  })

  test('technicalReview with empty object -> defaults status to new', () => {
    const payload = {
      ...applianceBasePayload,
      technicalReview: {}
    }

    const { value, error } = applianceSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value.technicalReview.status).toBe('new')
  })

  test('technicalReview status empty string -> defaults to new', () => {
    const payload = {
      ...applianceBasePayload,
      technicalReview: {
        status: ''
      }
    }

    const { value, error } = applianceSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value.technicalReview.status).toBe('new')
  })

  test('technicalReview status null -> defaults to new', () => {
    const payload = {
      ...applianceBasePayload,
      technicalReview: {
        status: null
      }
    }

    const { value, error } = applianceSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value.technicalReview.status).toBe('new')
  })

  test.each(['new', 'in_review', 'accepted', 'rejected'])(
    'technicalReview accepts status "%s"',
    (status) => {
      const payload = {
        ...applianceBasePayload,
        technicalReview: {
          status
        }
      }

      const { value, error } = applianceSchema.validate(payload)

      expect(error).toBeUndefined()
      expect(value.technicalReview.status).toBe(status)
    }
  )

  test('technicalReview rejects invalid status', () => {
    const payload = {
      ...applianceBasePayload,
      technicalReview: {
        status: 'approved'
      }
    }

    const { error } = applianceSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].path).toEqual(['technicalReview', 'status'])
  })

  test('technicalReview accepts complete reviewer object', () => {
    const payload = {
      ...applianceBasePayload,
      technicalReview: {
        reviewer: {
          name: 'John Reviewer',
          email: 'john.reviewer@test.com'
        }
      }
    }

    const { value, error } = applianceSchema.validate(payload)

    expect(error).toBeUndefined()

    expect(value.technicalReview.reviewer).toEqual({
      name: 'John Reviewer',
      email: 'john.reviewer@test.com'
    })
  })

  test('technicalReview accepts reviewer with only name', () => {
    const payload = {
      ...applianceBasePayload,
      technicalReview: {
        reviewer: {
          name: 'John Reviewer'
        }
      }
    }

    const { value, error } = applianceSchema.validate(payload)

    expect(error).toBeUndefined()

    expect(value.technicalReview.reviewer).toEqual({
      name: 'John Reviewer'
    })
  })

  test('technicalReview accepts reviewer with only email', () => {
    const payload = {
      ...applianceBasePayload,
      technicalReview: {
        reviewer: {
          email: 'john.reviewer@test.com'
        }
      }
    }

    const { value, error } = applianceSchema.validate(payload)

    expect(error).toBeUndefined()

    expect(value.technicalReview.reviewer).toEqual({
      email: 'john.reviewer@test.com'
    })
  })

  test('technicalReview accepts empty reviewer object', () => {
    const payload = {
      ...applianceBasePayload,
      technicalReview: {
        reviewer: {}
      }
    }

    const { error } = applianceSchema.validate(payload)

    expect(error).toBeUndefined()
  })

  test('technicalReview rejects reviewer as string', () => {
    const payload = {
      ...applianceBasePayload,
      technicalReview: {
        reviewer: 'John Reviewer'
      }
    }

    const { error } = applianceSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].path).toEqual(['technicalReview', 'reviewer'])
  })

  test('technicalReview accepts valid updatedAt date', () => {
    const payload = {
      ...applianceBasePayload,
      technicalReview: {
        updatedAt: '2025-01-01T12:00:00.000Z'
      }
    }

    const { value, error } = applianceSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value.technicalReview.updatedAt).toBeInstanceOf(Date)
  })

  test('technicalReview rejects invalid updatedAt date', () => {
    const payload = {
      ...applianceBasePayload,
      technicalReview: {
        updatedAt: 'not-a-date'
      }
    }

    const { error } = applianceSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].path).toEqual(['technicalReview', 'updatedAt'])
  })

  test('technicalReview accepts status, reviewer and updatedAt together', () => {
    const payload = {
      ...applianceBasePayload,
      technicalReview: {
        status: 'accepted',
        reviewer: {
          name: 'Jane Reviewer',
          email: 'jane.reviewer@test.com'
        },
        updatedAt: '2025-01-01T12:00:00.000Z'
      }
    }

    const { value, error } = applianceSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value.technicalReview.status).toBe('accepted')
    expect(value.technicalReview.reviewer.name).toBe('Jane Reviewer')
    expect(value.technicalReview.reviewer.email).toBe('jane.reviewer@test.com')
    expect(value.technicalReview.updatedAt).toBeInstanceOf(Date)
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

describe('fuelSchema - companyPhone', () => {
  const baseFuelPayload = fuelExample

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
    const payload = {
      ...baseFuelPayload,
      companyPhone: '+44 7405334441'
    }

    const { value, error } = fuelSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value.companyPhone).not.toBe('+44 222 333 4441')
  })

  test('optional phone -> undefined passes', () => {
    const { companyPhone, ...payload } = { ...baseFuelPayload }

    const { value, error } = fuelSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value.companyPhone).toBeUndefined()
  })

  test('invalid phone (try/catch) -> error', () => {
    const payload = {
      ...baseFuelPayload,
      companyPhone: '###bad###'
    }

    const { error } = fuelSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].message).toContain(TEST_INVALID_PHONE_MSG)
  })

  test('invalid phone format (parse fails) -> catch block', () => {
    const payload = {
      ...baseFuelPayload,
      companyPhone: '!!!invalid!!!'
    }

    const { error } = fuelSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].message).toContain(TEST_INVALID_PHONE_MSG)
  })

  test('phone parses but is not valid (isValidNumber returns false)', () => {
    const payload = {
      ...baseFuelPayload,
      companyPhone: '+44 1234'
    }

    const { error } = fuelSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].message).toContain(TEST_INVALID_PHONE_MSG)
  })

  test('isUkBased false -> address fields optional', () => {
    const {
      companyAddressLine1,
      companyAddressCity,
      companyAddressPostcode,
      ...rest
    } = baseFuelPayload

    const payload = { ...rest, isUkBased: false }

    const { error } = fuelSchema.validate(payload)

    expect(error).toBeUndefined()
  })

  test('isUkBased true -> companyAddressLine1 required', () => {
    const { companyAddressLine1, ...payload } = baseFuelPayload

    const { error } = fuelSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].path).toContain('companyAddressLine1')
  })

  test('isUkBased true -> companyAddressCity required', () => {
    const { companyAddressCity, ...payload } = baseFuelPayload

    const { error } = fuelSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].path).toContain('companyAddressCity')
  })

  test('isUkBased true -> companyAddressPostcode required', () => {
    const { companyAddressPostcode, ...payload } = baseFuelPayload

    const { error } = fuelSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].path).toContain('companyAddressPostcode')
  })
})
