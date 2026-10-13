import { describe, expect, test } from 'vitest'

import {
  passedInstructionManualSchema,
  failedInstructionManualSchema
} from './instruction-manual-payload-schema.js'

describe('passedInstructionManualSchema', () => {
  const validPayload = {
    title: 'Installation and operating manual',
    version: '2.1',
    publicationDate: '2024-02-29'
  }

  test('accepts a valid versioned manual', () => {
    const { value, error } =
      passedInstructionManualSchema.validate(validPayload)

    expect(error).toBeUndefined()
    expect(value).toEqual(validPayload)
  })

  test.each([
    ['title', 'any.required'],
    ['publicationDate', 'any.required']
  ])('requires %s', (field, code) => {
    const payload = { ...validPayload }
    delete payload[field]

    const { error } = passedInstructionManualSchema.validate(payload)

    expect(error.details[0]).toMatchObject({ path: [field], type: code })
  })

  test('rejects an empty title', () => {
    const { error } = passedInstructionManualSchema.validate({
      ...validPayload,
      title: '   '
    })

    expect(error).toBeDefined()
  })

  test('rejects a title over 200 characters', () => {
    const { error } = passedInstructionManualSchema.validate({
      ...validPayload,
      title: 'a'.repeat(201)
    })

    expect(error.details[0]).toMatchObject({
      path: ['title'],
      type: 'string.max'
    })
  })

  test('accepts a null or empty version for a passed review', () => {
    const nullVersion = passedInstructionManualSchema.validate({
      ...validPayload,
      version: null
    })
    const emptyVersion = passedInstructionManualSchema.validate({
      ...validPayload,
      version: ''
    })

    expect(nullVersion.error).toBeUndefined()
    expect(emptyVersion.error).toBeUndefined()
  })

  test('rejects a version over 100 characters', () => {
    const { error } = passedInstructionManualSchema.validate({
      ...validPayload,
      version: 'v'.repeat(101)
    })

    expect(error.details[0]).toMatchObject({
      path: ['version'],
      type: 'string.max'
    })
  })

  test.each([
    ['a non-ISO format', '29/02/2024'],
    ['a partial date', '2024-02'],
    ['an impossible day', '2024-02-31'],
    ['a non-leap-year 29 February', '2023-02-29'],
    ['a month out of range', '2024-13-01'],
    ['a year before 1900', '1899-12-31']
  ])('rejects %s', (_, publicationDate) => {
    const { error } = passedInstructionManualSchema.validate({
      ...validPayload,
      publicationDate
    })

    expect(error.details[0].path).toEqual(['publicationDate'])
  })

  test('rejects unknown fields', () => {
    const { error } = passedInstructionManualSchema.validate({
      ...validPayload,
      additionalInfo: 'not accepted here'
    })

    expect(error).toBeDefined()
  })
})

describe('failedInstructionManualSchema', () => {
  test('accepts an entirely empty payload', () => {
    const { value, error } = failedInstructionManualSchema.validate({})

    expect(error).toBeUndefined()
    expect(value).toEqual({
      title: null,
      version: null,
      publicationDate: null
    })
  })

  test('accepts a null publication date', () => {
    const { value, error } = failedInstructionManualSchema.validate({
      title: 'Partial manual',
      version: '',
      publicationDate: null
    })

    expect(error).toBeUndefined()
    expect(value.publicationDate).toBeNull()
  })

  test('keeps a complete valid publication date', () => {
    const { value, error } = failedInstructionManualSchema.validate({
      publicationDate: '2024-05-06'
    })

    expect(error).toBeUndefined()
    expect(value.publicationDate).toBe('2024-05-06')
  })

  test('still rejects an impossible date that was fully entered', () => {
    const { error } = failedInstructionManualSchema.validate({
      publicationDate: '2024-02-31'
    })

    expect(error.details[0].path).toEqual(['publicationDate'])
  })

  test('still enforces the maximum lengths', () => {
    const { error } = failedInstructionManualSchema.validate({
      title: 'a'.repeat(201)
    })

    expect(error.details[0]).toMatchObject({
      path: ['title'],
      type: 'string.max'
    })
  })
})
