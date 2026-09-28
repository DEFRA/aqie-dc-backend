import { describe, expect, test } from 'vitest'

import { testReportPayloadSchema } from './test-report-payload-schema.js'

describe('testReportPayloadSchema', () => {
  const validPassedPayload = {
    reviewStatus: true,
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

  test('accepts a valid passed test report', () => {
    const { value, error } =
      testReportPayloadSchema.validate(validPassedPayload)

    expect(error).toBeUndefined()
    expect(value).toEqual(validPassedPayload)
  })

  test('rounds passed measurements to two decimal places', () => {
    const payload = {
      reviewStatus: true,
      ratedOutput: 1.005,
      testedOutput: {
        rated: 2.345,
        low: 3.456
      },
      smokeEmissionOutput: {
        rated: 4.567,
        low: 5.678
      }
    }

    const { value, error } = testReportPayloadSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value.ratedOutput).toBe(1.01)
    expect(value.testedOutput.rated).toBe(2.35)
    expect(value.testedOutput.low).toBe(3.46)
    expect(value.smokeEmissionOutput.rated).toBe(4.57)
    expect(value.smokeEmissionOutput.low).toBe(5.68)
  })

  test('does not change measurements that already have two decimal places', () => {
    const payload = {
      reviewStatus: true,
      ratedOutput: 10.25,
      testedOutput: {
        rated: 8.5,
        low: 4.25
      },
      smokeEmissionOutput: {
        rated: 2.75,
        low: 1.2
      }
    }

    const { value, error } = testReportPayloadSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value).toEqual(payload)
  })

  test.each([
    [
      'ratedOutput',
      {
        ...validPassedPayload,
        ratedOutput: -1
      }
    ],
    [
      'testedOutput.rated',
      {
        ...validPassedPayload,
        testedOutput: {
          ...validPassedPayload.testedOutput,
          rated: -1
        }
      }
    ],
    [
      'testedOutput.low',
      {
        ...validPassedPayload,
        testedOutput: {
          ...validPassedPayload.testedOutput,
          low: -1
        }
      }
    ],
    [
      'smokeEmissionOutput.rated',
      {
        ...validPassedPayload,
        smokeEmissionOutput: {
          ...validPassedPayload.smokeEmissionOutput,
          rated: -1
        }
      }
    ],
    [
      'smokeEmissionOutput.low',
      {
        ...validPassedPayload,
        smokeEmissionOutput: {
          ...validPassedPayload.smokeEmissionOutput,
          low: -1
        }
      }
    ]
  ])('rejects negative passed measurement for %s', (_, payload) => {
    const { error } = testReportPayloadSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].type).toBe('number.min')
  })

  test('requires ratedOutput when the test report has passed', () => {
    const payload = structuredClone(validPassedPayload)

    delete payload.ratedOutput

    const { error } = testReportPayloadSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].path).toEqual(['ratedOutput'])
  })

  test('requires testedOutput when the test report has passed', () => {
    const payload = structuredClone(validPassedPayload)

    delete payload.testedOutput

    const { error } = testReportPayloadSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].path).toEqual(['testedOutput'])
  })

  test('requires testedOutput.rated when the test report has passed', () => {
    const payload = structuredClone(validPassedPayload)

    delete payload.testedOutput.rated

    const { error } = testReportPayloadSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].path).toEqual(['testedOutput', 'rated'])
  })

  test('requires testedOutput.low when the test report has passed', () => {
    const payload = structuredClone(validPassedPayload)

    delete payload.testedOutput.low

    const { error } = testReportPayloadSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].path).toEqual(['testedOutput', 'low'])
  })

  test('requires smokeEmissionOutput when the test report has passed', () => {
    const payload = structuredClone(validPassedPayload)

    delete payload.smokeEmissionOutput

    const { error } = testReportPayloadSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].path).toEqual(['smokeEmissionOutput'])
  })

  test('requires smokeEmissionOutput.rated when the report has passed', () => {
    const payload = structuredClone(validPassedPayload)

    delete payload.smokeEmissionOutput.rated

    const { error } = testReportPayloadSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].path).toEqual(['smokeEmissionOutput', 'rated'])
  })

  test('requires smokeEmissionOutput.low when the report has passed', () => {
    const payload = structuredClone(validPassedPayload)

    delete payload.smokeEmissionOutput.low

    const { error } = testReportPayloadSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].path).toEqual(['smokeEmissionOutput', 'low'])
  })

  test('allows flexible measurement values when the report has failed', () => {
    const payload = {
      reviewStatus: false,
      ratedOutput: 'not available',
      testedOutput: {
        rated: 'failed',
        low: -1
      },
      smokeEmissionOutput: {
        rated: '',
        low: null
      }
    }

    const { value, error } = testReportPayloadSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value).toEqual(payload)
  })

  test('preserves failed string measurements as strings', () => {
    const payload = {
      reviewStatus: false,
      ratedOutput: '10.25',
      testedOutput: {
        rated: '5.5',
        low: '2.5'
      },
      smokeEmissionOutput: {
        rated: '3.5',
        low: '1.5'
      }
    }

    const { value, error } = testReportPayloadSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value.ratedOutput).toBe('10.25')
    expect(value.testedOutput.rated).toBe('5.5')
    expect(value.testedOutput.low).toBe('2.5')
    expect(value.smokeEmissionOutput.rated).toBe('3.5')
    expect(value.smokeEmissionOutput.low).toBe('1.5')
  })

  test('allows failed measurement fields to be omitted', () => {
    const payload = {
      reviewStatus: false
    }

    const { value, error } = testReportPayloadSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value).toEqual({
      reviewStatus: false
    })
  })

  test('allows null failed measurement values', () => {
    const payload = {
      reviewStatus: false,
      ratedOutput: null,
      testedOutput: {
        rated: null,
        low: null
      },
      smokeEmissionOutput: {
        rated: null,
        low: null
      }
    }

    const { value, error } = testReportPayloadSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value).toEqual(payload)
  })

  test('allows null reviewStatus for a report not yet reviewed', () => {
    const payload = {
      reviewStatus: null
    }

    const { value, error } = testReportPayloadSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value).toEqual({
      reviewStatus: null
    })
  })

  test('requires reviewStatus', () => {
    const { error } = testReportPayloadSchema.validate({})

    expect(error).toBeDefined()
    expect(error.details[0].path).toEqual(['reviewStatus'])
    expect(error.details[0].type).toBe('any.required')
  })

  test('rejects a non-boolean reviewStatus', () => {
    const { error } = testReportPayloadSchema.validate({
      reviewStatus: 'passed'
    })

    expect(error).toBeDefined()
    expect(error.details[0].path).toEqual(['reviewStatus'])
    expect(error.details[0].type).toBe('boolean.base')
  })

  test('rejects unknown top-level fields', () => {
    const payload = {
      ...validPassedPayload,
      unexpectedField: 'not allowed'
    }

    const { error } = testReportPayloadSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].path).toEqual(['unexpectedField'])
    expect(error.details[0].type).toBe('object.unknown')
  })

  test('rejects unknown fields inside testedOutput', () => {
    const payload = {
      ...validPassedPayload,
      testedOutput: {
        ...validPassedPayload.testedOutput,
        unexpectedField: 123
      }
    }

    const { error } = testReportPayloadSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].path).toEqual(['testedOutput', 'unexpectedField'])
    expect(error.details[0].type).toBe('object.unknown')
  })

  test('rejects unknown fields inside smokeEmissionOutput', () => {
    const payload = {
      ...validPassedPayload,
      smokeEmissionOutput: {
        ...validPassedPayload.smokeEmissionOutput,
        unexpectedField: 123
      }
    }

    const { error } = testReportPayloadSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].path).toEqual([
      'smokeEmissionOutput',
      'unexpectedField'
    ])
    expect(error.details[0].type).toBe('object.unknown')
  })
})
