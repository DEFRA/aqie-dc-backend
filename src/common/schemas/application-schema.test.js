import { describe, expect, test } from 'vitest'
import { applicationsSchema } from './application-schema.js'
import applicationExample from '../../sample-data/application-example.js'

describe('application-schema applicationsSchema', () => {
  test('accepts valid application payload from sample data', () => {
    const payload = structuredClone(applicationExample)

    const { error } = applicationsSchema.validate(payload)

    expect(error).toBeUndefined()
  })

  test('defaults status to new when omitted', () => {
    const payload = structuredClone(applicationExample)
    delete payload.status

    const { value, error } = applicationsSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value.status).toBe('new')
  })

  test('rejects invalid application type', () => {
    const payload = {
      ...structuredClone(applicationExample),
      type: 'unknown-type'
    }

    const { error } = applicationsSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('must be one of')
  })

  test('accepts reviewedBy as object', () => {
    const payload = {
      ...structuredClone(applicationExample),
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
      ...structuredClone(applicationExample),
      reviewedBy: 'John Reviewer'
    }

    const { error } = applicationsSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('must be of type object')
  })

  test('rejects unknown keys', () => {
    const payload = {
      ...structuredClone(applicationExample),
      unknownField: 'not-allowed'
    }

    const { error } = applicationsSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].type).toBe('object.unknown')
  })
})
