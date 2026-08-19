import { describe, test, expect } from 'vitest'
import { applianceSchema, fuelSchema, applicationsSchema } from './schema.js'
import applianceExample from '../sample-data/appliance-example.js'
import fuelExample from '../sample-data/fuel-example.js'
import applicationExample from '../sample-data/application-example.js'

describe('applianceSchema', () => {
  const applianceBasePayload = {
    ...applianceExample,
    companyContact: {
      ...applianceExample.companyContact,
      phone: undefined
    }
  }

  describe('companyContact.phone', () => {
    test('optional phone -> undefined passes', () => {
      const { value, error } = applianceSchema.validate(applianceBasePayload)

      expect(error).toBeUndefined()
      expect(value.companyContact.phone).toBeUndefined()
    })

    test('valid phone string passes', () => {
      const payload = {
        ...applianceBasePayload,
        companyContact: {
          ...applianceBasePayload.companyContact,
          phone: '07405123456'
        }
      }

      const { value, error } = applianceSchema.validate(payload)

      expect(error).toBeUndefined()
      expect(value.companyContact.phone).toBe('07405123456')
    })

    test('null phone passes', () => {
      const payload = {
        ...applianceBasePayload,
        companyContact: {
          ...applianceBasePayload.companyContact,
          phone: null
        }
      }

      const { error } = applianceSchema.validate(payload)

      expect(error).toBeUndefined()
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

    test('phone longer than 11 digits returns error', () => {
      const payload = {
        ...applianceBasePayload,
        companyContact: {
          ...applianceBasePayload.companyContact,
          phone: '+123456789012'
        }
      }

      const { error } = applianceSchema.validate(payload)

      expect(error).toBeDefined()
      expect(error.details[0].type).toBe('string.pattern.base')
    })
  })

  describe('approvalField', () => {
    test('approvalField empty string defaults to Uncertified', () => {
      const payload = {
        ...applianceBasePayload,
        walesApproval: ''
      }

      const { value, error } = applianceSchema.validate(payload)

      expect(error).toBeUndefined()
      expect(value.walesApproval).toBe('Uncertified')
    })

    test('approvalField null defaults to Uncertified', () => {
      const payload = {
        ...applianceBasePayload,
        walesApproval: null
      }

      const { value, error } = applianceSchema.validate(payload)

      expect(error).toBeUndefined()
      expect(value.walesApproval).toBe('Uncertified')
    })

    test('approvalField omitted defaults to Uncertified', () => {
      const { walesApproval, ...payload } = applianceBasePayload

      const { value, error } = applianceSchema.validate(payload)

      expect(error).toBeUndefined()
      expect(value.walesApproval).toBe('Uncertified')
    })

    test('approvalField invalid value returns validation error', () => {
      const payload = {
        ...applianceBasePayload,
        scotlandApproval: 'InvalidValue'
      }

      const { error } = applianceSchema.validate(payload)

      expect(error).toBeDefined()
      expect(error.details[0].path).toEqual(['scotlandApproval'])
    })
  })

  describe('address validation', () => {
    test('isUkBased false -> companyFullAddress required instead', () => {
      const payload = {
        ...applianceBasePayload,
        isUkBased: false,
        companyFullAddress: '123 Overseas Street, Paris',
        companyAddress: {}
      }

      const { error } = applianceSchema.validate(payload)

      expect(error).toBeUndefined()
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

  describe('technicalReview', () => {
    test('technicalReview omitted -> defaults to new', () => {
      const { technicalReview, ...payload } = applianceBasePayload

      const { value, error } = applianceSchema.validate(payload)

      expect(error).toBeUndefined()
      expect(value.technicalReview).toEqual({ status: 'new' })
    })

    test.each(['new', 'in_review', 'accepted', 'rejected'])(
      'technicalReview accepts status "%s"',
      (status) => {
        const payload = {
          ...applianceBasePayload,
          technicalReview: { status }
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
  })
})

describe('applicationsSchema', () => {
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

  test('reviewer string is rejected', () => {
    const payload = {
      ...applicationExample,
      reviewer: 'John Reviewer'
    }

    const { error } = applicationsSchema.validate(payload)

    expect(error).toBeDefined()
  })

  test('status defaults to new when omitted', () => {
    const { status, ...payload } = applicationExample

    const { value, error } = applicationsSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value.status).toBe('new')
  })
})

describe('fuelSchema', () => {
  const baseFuelPayload = {
    ...fuelExample,
    companyContact: {
      ...fuelExample.companyContact,
      phone: undefined
    }
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

  describe('companyContact.phone', () => {
    test('optional phone -> undefined passes', () => {
      const { value, error } = fuelSchema.validate(baseFuelPayload)

      expect(error).toBeUndefined()
      expect(value.companyContact.phone).toBeUndefined()
    })

    test('invalid phone format returns error', () => {
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
  })

  describe('approvalField defaults', () => {
    test('walesApproval defaults to Uncertified when omitted', () => {
      const { walesApproval, ...payload } = baseFuelPayload

      const { value, error } = fuelSchema.validate(payload)

      expect(error).toBeUndefined()
      expect(value.walesApproval).toBe('Uncertified')
    })

    test('walesApproval null defaults to Uncertified', () => {
      const payload = {
        ...baseFuelPayload,
        walesApproval: null
      }

      const { value, error } = fuelSchema.validate(payload)

      expect(error).toBeUndefined()
      expect(value.walesApproval).toBe('Uncertified')
    })
  })

  describe('address validation', () => {
    test('isUkBased false -> companyFullAddress required instead', () => {
      const payload = {
        ...baseFuelPayload,
        isUkBased: false,
        companyFullAddress: '123 Overseas Street, Paris',
        companyAddress: {}
      }

      const { error } = fuelSchema.validate(payload)

      expect(error).toBeUndefined()
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
})
