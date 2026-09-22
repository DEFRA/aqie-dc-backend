import { describe, expect, test } from 'vitest'
import { applicationsSchema } from './application-schema.js'
import {
  applianceApplicationExample,
  fuelApplicationExample
} from '../../sample-data/application-example.js'

describe('application-schema applicationsSchema', () => {
  test('accepts valid appliance application payload from sample data', () => {
    const payload = structuredClone(applianceApplicationExample)

    const { error } = applicationsSchema.validate(payload)

    expect(error).toBeUndefined()
  })

  test('accepts valid fuel application payload from sample data', () => {
    const payload = structuredClone(fuelApplicationExample)

    const { error } = applicationsSchema.validate(payload)

    expect(error).toBeUndefined()
  })

  test('defaults status to new when omitted', () => {
    const payload = structuredClone(applianceApplicationExample)
    delete payload.status

    const { value, error } = applicationsSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value.status).toBe('new')
  })

  test('rejects invalid application type', () => {
    const payload = {
      ...structuredClone(applianceApplicationExample),
      type: 'unknown-type'
    }

    const { error } = applicationsSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('must be one of')
  })

  test('accepts reviewedBy as object', () => {
    const payload = {
      ...structuredClone(applianceApplicationExample),
      reviewedBy: {
        name: 'John Reviewer',
        email: 'john@reviewer.com'
      }
    }

    const { value, error } = applicationsSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value.reviewedBy).toEqual({
      name: 'John Reviewer',
      email: 'john@reviewer.com'
    })
  })

  test('rejects reviewedBy when provided as string', () => {
    const payload = {
      ...structuredClone(applianceApplicationExample),
      reviewedBy: 'John Reviewer'
    }

    const { error } = applicationsSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('must be of type object')
  })

  test('rejects unknown keys', () => {
    const payload = {
      ...structuredClone(applianceApplicationExample),
      unknownField: 'not-allowed'
    }

    const { error } = applicationsSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].type).toBe('object.unknown')
  })
})
