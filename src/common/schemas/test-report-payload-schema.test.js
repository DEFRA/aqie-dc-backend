import { describe, expect, test } from 'vitest'

import {
  passedTestReportSchema,
  failedTestReportSchema
} from './test-report-payload-schema.js'

describe('passedTestReportSchema', () => {
  const validPassedPayload = {
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
    const { value, error } = passedTestReportSchema.validate(validPassedPayload)

    expect(error).toBeUndefined()
    expect(value).toEqual(validPassedPayload)
  })

  test('rounds passed measurements to two decimal places', () => {
    const payload = {
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

    const { value, error } = passedTestReportSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value.ratedOutput).toBe(1.01)
    expect(value.testedOutput.rated).toBe(2.35)
    expect(value.testedOutput.low).toBe(3.46)
    expect(value.smokeEmissionOutput.rated).toBe(4.57)
    expect(value.smokeEmissionOutput.low).toBe(5.68)
  })

  test('does not change measurements that already have two decimal places', () => {
    const payload = {
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

    const { value, error } = passedTestReportSchema.validate(payload)

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
    const { error } = passedTestReportSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].type).toBe('number.min')
  })

  test.each([
    [
      'ratedOutput',
      {
        ...validPassedPayload,
        ratedOutput: undefined
      }
    ],
    [
      'testedOutput',
      {
        ...validPassedPayload,
        testedOutput: undefined
      }
    ],
    [
      'testedOutput.rated',
      {
        ...validPassedPayload,
        testedOutput: {
          ...validPassedPayload.testedOutput,
          rated: undefined
        }
      }
    ],
    [
      'testedOutput.low',
      {
        ...validPassedPayload,
        testedOutput: {
          ...validPassedPayload.testedOutput,
          low: undefined
        }
      }
    ],
    [
      'smokeEmissionOutput',
      {
        ...validPassedPayload,
        smokeEmissionOutput: undefined
      }
    ],
    [
      'smokeEmissionOutput.rated',
      {
        ...validPassedPayload,
        smokeEmissionOutput: {
          ...validPassedPayload.smokeEmissionOutput,
          rated: undefined
        }
      }
    ],
    [
      'smokeEmissionOutput.low',
      {
        ...validPassedPayload,
        smokeEmissionOutput: {
          ...validPassedPayload.smokeEmissionOutput,
          low: undefined
        }
      }
    ]
  ])('requires %s when the test report has passed', (_, payload) => {
    const { error } = passedTestReportSchema.validate(payload)

    expect(error).toBeDefined()
  })

  test('rejects string measurements for passed reports', () => {
    const { error } = passedTestReportSchema.validate({
      ratedOutput: '5.25',
      testedOutput: {
        rated: 5.1,
        low: 2.4
      },
      smokeEmissionOutput: {
        rated: 3.2,
        low: 1.1
      }
    })

    expect(error).toBeDefined()
  })

  test('rejects unknown top-level fields', () => {
    const payload = {
      ...validPassedPayload,
      unexpectedField: 'not allowed'
    }

    const { error } = passedTestReportSchema.validate(payload)

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

    const { error } = passedTestReportSchema.validate(payload)

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

    const { error } = passedTestReportSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].path).toEqual([
      'smokeEmissionOutput',
      'unexpectedField'
    ])
    expect(error.details[0].type).toBe('object.unknown')
  })
})

describe('failedTestReportSchema', () => {
  test('allows flexible measurement values when the report has failed', () => {
    const payload = {
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

    const { value, error } = failedTestReportSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value).toEqual(payload)
  })

  test('preserves failed string measurements as strings', () => {
    const payload = {
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

    const { value, error } = failedTestReportSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value.ratedOutput).toBe('10.25')
    expect(value.testedOutput.rated).toBe('5.5')
    expect(value.testedOutput.low).toBe('2.5')
    expect(value.smokeEmissionOutput.rated).toBe('3.5')
    expect(value.smokeEmissionOutput.low).toBe('1.5')
  })

  test('allows failed measurement fields to be omitted', () => {
    const payload = {
      ratedOutput: 'failed'
    }

    const { value, error } = failedTestReportSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value.testedOutput).toBeUndefined()
    expect(value.smokeEmissionOutput).toBeUndefined()
  })

  test('allows null failed measurement values', () => {
    const payload = {
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

    const { value, error } = failedTestReportSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value).toEqual(payload)
  })

  test('allows empty string for failed measurements', () => {
    const payload = {
      ratedOutput: '',
      testedOutput: {
        rated: '',
        low: ''
      },
      smokeEmissionOutput: {
        rated: '',
        low: ''
      }
    }

    const { value, error } = failedTestReportSchema.validate(payload)

    expect(error).toBeUndefined()
    expect(value).toEqual(payload)
  })

  test('rejects unknown top-level fields', () => {
    const payload = {
      ratedOutput: 'failed',
      unexpectedField: 'value'
    }

    const { error } = failedTestReportSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].path).toEqual(['unexpectedField'])
    expect(error.details[0].type).toBe('object.unknown')
  })

  test('rejects unknown fields inside testedOutput', () => {
    const payload = {
      ratedOutput: 'failed',
      testedOutput: {
        rated: 'failed',
        unexpectedField: 123
      }
    }

    const { error } = failedTestReportSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].path).toEqual(['testedOutput', 'unexpectedField'])
    expect(error.details[0].type).toBe('object.unknown')
  })

  test('rejects unknown fields inside smokeEmissionOutput', () => {
    const payload = {
      ratedOutput: 'failed',
      smokeEmissionOutput: {
        rated: 'failed',
        unexpectedField: 123
      }
    }

    const { error } = failedTestReportSchema.validate(payload)

    expect(error).toBeDefined()
    expect(error.details[0].path).toEqual([
      'smokeEmissionOutput',
      'unexpectedField'
    ])
    expect(error.details[0].type).toBe('object.unknown')
  })
})
