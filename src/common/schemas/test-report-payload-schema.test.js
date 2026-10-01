import { describe, expect, test } from 'vitest'

import { testResultsSchema } from './test-report-payload-schema.js'

describe('testResultsSchema', () => {
  const validPayload = {
    ratedOutput: 5.25,
    testedOutput: {
      rated: 5.1,
      low: 2.4
    },
    smokeEmissionOutput: {
      rated: 3.2,
      low: 1.1
    }
  }

  describe('valid values', () => {
    test('accepts a full set of measurements', () => {
      const { value, error } = testResultsSchema.validate(validPayload)

      expect(error).toBeUndefined()
      expect(value).toEqual(validPayload)
    })

    test('accepts zero', () => {
      const { error } = testResultsSchema.validate({
        ...validPayload,
        smokeEmissionOutput: { rated: 0, low: 0 }
      })

      expect(error).toBeUndefined()
    })

    test('accepts an empty object - a failed report with nothing entered', () => {
      const { error } = testResultsSchema.validate({})

      expect(error).toBeUndefined()
    })

    test('accepts a partial set of measurements', () => {
      const { error } = testResultsSchema.validate({
        ratedOutput: 5.25,
        testedOutput: { rated: 5.1 }
      })

      expect(error).toBeUndefined()
    })

    test('allows null when the report gives no figure', () => {
      const { error } = testResultsSchema.validate({
        ratedOutput: null,
        testedOutput: { rated: null, low: null },
        smokeEmissionOutput: { rated: null, low: null }
      })

      expect(error).toBeUndefined()
    })
  })

  describe('rounding', () => {
    test('rounds to two decimal places', () => {
      const { value, error } = testResultsSchema.validate({
        ratedOutput: 1.005,
        testedOutput: { rated: 5.678, low: 2.344 },
        smokeEmissionOutput: { rated: 3.2555, low: 1.111 }
      })

      expect(error).toBeUndefined()
      expect(value).toEqual({
        ratedOutput: 1.01,
        testedOutput: { rated: 5.68, low: 2.34 },
        smokeEmissionOutput: { rated: 3.26, low: 1.11 }
      })
    })

    test('leaves values that already have two decimal places unchanged', () => {
      const { value, error } = testResultsSchema.validate(validPayload)

      expect(error).toBeUndefined()
      expect(value).toEqual(validPayload)
    })

    test('does not round null', () => {
      const { value, error } = testResultsSchema.validate({ ratedOutput: null })

      expect(error).toBeUndefined()
      expect(value.ratedOutput).toBeNull()
    })
  })

  describe('rejected values', () => {
    // kW output and grams-per-hour emissions cannot be below zero,
    // on a passed report or a failed one.
    test.each([
      ['ratedOutput', { ...validPayload, ratedOutput: -1 }],
      [
        'testedOutput.rated',
        {
          ...validPayload,
          testedOutput: { ...validPayload.testedOutput, rated: -1 }
        }
      ],
      [
        'testedOutput.low',
        {
          ...validPayload,
          testedOutput: { ...validPayload.testedOutput, low: -1 }
        }
      ],
      [
        'smokeEmissionOutput.rated',
        {
          ...validPayload,
          smokeEmissionOutput: {
            ...validPayload.smokeEmissionOutput,
            rated: -1
          }
        }
      ],
      [
        'smokeEmissionOutput.low',
        {
          ...validPayload,
          smokeEmissionOutput: { ...validPayload.smokeEmissionOutput, low: -1 }
        }
      ]
    ])('rejects a negative value for %s', (_, payload) => {
      const { error } = testResultsSchema.validate(payload)

      expect(error).toBeDefined()
      expect(error.details[0].type).toBe('number.min')
    })

    test.each([
      ['a numeric string', '10.5'],
      ['text', 'N/A'],
      ['an empty string', ''],
      ['alphanumeric text', '1abc']
    ])('rejects %s', (_, badValue) => {
      const { error } = testResultsSchema.validate({
        ...validPayload,
        ratedOutput: badValue
      })

      expect(error).toBeDefined()
      expect(error.details[0].type).toBe('number.base')
    })

    test('rejects unknown top-level fields', () => {
      const { error } = testResultsSchema.validate({
        ...validPayload,
        reviewStatus: true
      })

      expect(error).toBeDefined()
      expect(error.message).toContain('reviewStatus')
    })

    test('rejects unknown fields inside testedOutput', () => {
      const { error } = testResultsSchema.validate({
        ...validPayload,
        testedOutput: { ...validPayload.testedOutput, medium: 3 }
      })

      expect(error).toBeDefined()
      expect(error.message).toContain('medium')
    })

    test('rejects unknown fields inside smokeEmissionOutput', () => {
      const { error } = testResultsSchema.validate({
        ...validPayload,
        smokeEmissionOutput: {
          ...validPayload.smokeEmissionOutput,
          medium: 3
        }
      })

      expect(error).toBeDefined()
      expect(error.message).toContain('medium')
    })
  })
})
