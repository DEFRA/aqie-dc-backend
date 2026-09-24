import { beforeEach, describe, expect, test, vi } from 'vitest'

import { updateTestReport } from '../update-test-report.js'

import { statusCodes } from '../../../common/constants/status-codes.js'

const { updateTestReportMock } = vi.hoisted(() => ({
  updateTestReportMock: vi.fn()
}))

vi.mock('../../../controllers/appliance-review-controller.js', () => ({
  updateTestReport: updateTestReportMock
}))

describe('PATCH /appliances/{id}/test-reports', () => {
  let mockRequest
  let mockToolkit

  const validPayload = {
    ratedOutput: 5.2,
    testedOutput: {
      rated: 5.1,
      low: 2.4
    },
    smokeEmissionOutput: {
      rated: 3.1,
      low: 2.2
    },
    reviewStatus: true
  }

  const validate = (payload) => {
    return updateTestReport.options.validate.payload.validate(payload)
  }

  beforeEach(() => {
    updateTestReportMock.mockReset()

    mockToolkit = {
      response: vi.fn((data) => ({
        code: vi.fn((code) => ({
          ...data,
          statusCode: code
        }))
      }))
    }

    mockRequest = {
      params: {
        id: 'APP-123'
      },
      payload: validPayload,
      db: {},
      logger: {
        info: vi.fn(),
        error: vi.fn()
      }
    }
  })

  describe('handler', () => {
    test('returns 200 when test reports are updated', async () => {
      updateTestReportMock.mockResolvedValue({
        success: true,
        data: validPayload
      })

      const result = await updateTestReport.handler(mockRequest, mockToolkit)

      expect(result.statusCode).toBe(statusCodes.ok)
    })

    test('passes request data to the controller', async () => {
      updateTestReportMock.mockResolvedValue({
        success: true,
        data: {}
      })

      await updateTestReport.handler(mockRequest, mockToolkit)

      expect(updateTestReportMock).toHaveBeenCalledWith(
        mockRequest.db,
        'APP-123',
        validPayload,
        mockRequest.logger
      )
    })

    test('passes failed string values to the controller', async () => {
      const failedPayload = {
        reviewStatus: false,
        ratedOutput: 'abc',
        testedOutput: {
          rated: '-1',
          low: 'ABC123'
        },
        smokeEmissionOutput: {
          rated: '',
          low: '1abc'
        }
      }

      mockRequest.payload = failedPayload

      updateTestReportMock.mockResolvedValue({
        success: true,
        data: failedPayload
      })

      await updateTestReport.handler(mockRequest, mockToolkit)

      expect(updateTestReportMock).toHaveBeenCalledWith(
        mockRequest.db,
        'APP-123',
        failedPayload,
        mockRequest.logger
      )
    })

    test('returns 404 when appliance is not found', async () => {
      updateTestReportMock.mockResolvedValue({
        success: false,
        notFound: true
      })

      const result = await updateTestReport.handler(mockRequest, mockToolkit)

      expect(result.statusCode).toBe(statusCodes.notFound)
    })

    test('returns 500 and logs controller errors', async () => {
      const error = new Error('Database error')

      updateTestReportMock.mockRejectedValue(error)

      const result = await updateTestReport.handler(mockRequest, mockToolkit)

      expect(result.isBoom).toBe(true)

      expect(result.output.statusCode).toBe(statusCodes.internalServerError)

      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        error,
        'Failed to update appliance test reports'
      )
    })
  })

  describe('payload validation', () => {
    test('accepts valid passed test-report data', () => {
      const result = validate(validPayload)

      expect(result.error).toBeUndefined()
      expect(result.value).toEqual(validPayload)
    })

    test('rounds passed measurements to two decimal places', () => {
      const payload = {
        reviewStatus: true,
        ratedOutput: 5.678,
        testedOutput: {
          rated: 5.124,
          low: 2.555
        },
        smokeEmissionOutput: {
          rated: 3.999,
          low: 1.005
        }
      }

      const result = validate(payload)

      expect(result.error).toBeUndefined()

      expect(result.value).toEqual({
        reviewStatus: true,
        ratedOutput: 5.68,
        testedOutput: {
          rated: 5.12,
          low: 2.56
        },
        smokeEmissionOutput: {
          rated: 4,
          low: 1.01
        }
      })
    })

    test('accepts zero values when passed', () => {
      const payload = {
        reviewStatus: true,
        ratedOutput: 0,
        testedOutput: {
          rated: 0,
          low: 0
        },
        smokeEmissionOutput: {
          rated: 0,
          low: 0
        }
      }

      expect(validate(payload).error).toBeUndefined()
    })

    test('requires reviewStatus', () => {
      const { reviewStatus, ...payloadWithoutStatus } = validPayload

      expect(validate(payloadWithoutStatus).error).toBeDefined()
    })

    test('requires all measurements when passed', () => {
      const payload = {
        reviewStatus: true,
        ratedOutput: 5.2
      }

      expect(validate(payload).error).toBeDefined()
    })

    test('rejects null rated output when passed', () => {
      const payload = {
        ...validPayload,
        ratedOutput: null
      }

      expect(validate(payload).error).toBeDefined()
    })

    test('rejects missing nested values when passed', () => {
      const payload = {
        ...validPayload,
        testedOutput: {
          rated: 5.1
        }
      }

      expect(validate(payload).error).toBeDefined()
    })

    test('rejects negative values when passed', () => {
      const payload = {
        ...validPayload,
        ratedOutput: -1
      }

      expect(validate(payload).error).toBeDefined()
    })

    test('rejects alphabetic values when passed', () => {
      const payload = {
        ...validPayload,
        ratedOutput: 'abc'
      }

      expect(validate(payload).error).toBeDefined()
    })

    test('rejects alphanumeric values when passed', () => {
      const payload = {
        ...validPayload,
        ratedOutput: '5abc'
      }

      expect(validate(payload).error).toBeDefined()
    })

    test('accepts failed status without measurements', () => {
      const payload = {
        reviewStatus: false
      }

      expect(validate(payload).error).toBeUndefined()
    })

    test('accepts failed status with null measurements', () => {
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

      expect(validate(payload).error).toBeUndefined()
    })

    test('accepts empty measurement values when failed', () => {
      const payload = {
        reviewStatus: false,
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

      const result = validate(payload)

      expect(result.error).toBeUndefined()
      expect(result.value).toEqual(payload)
    })

    test('accepts numeric strings when failed', () => {
      const payload = {
        reviewStatus: false,
        ratedOutput: '5.678',
        testedOutput: {
          rated: '5.2',
          low: '0.0'
        },
        smokeEmissionOutput: {
          rated: '3.1',
          low: '2.4'
        }
      }

      const result = validate(payload)

      expect(result.error).toBeUndefined()
      expect(result.value).toEqual(payload)
    })

    test('accepts negative values when failed', () => {
      const payload = {
        reviewStatus: false,
        ratedOutput: '-1',
        testedOutput: {
          rated: '-10.567',
          low: '-2'
        },
        smokeEmissionOutput: {
          rated: '-3.2',
          low: '-0.5'
        }
      }

      const result = validate(payload)

      expect(result.error).toBeUndefined()
      expect(result.value).toEqual(payload)
    })

    test('accepts alphabetic values when failed', () => {
      const payload = {
        reviewStatus: false,
        ratedOutput: 'abc',
        testedOutput: {
          rated: 'value',
          low: 'failed'
        },
        smokeEmissionOutput: {
          rated: 'invalid',
          low: 'unknown'
        }
      }

      const result = validate(payload)

      expect(result.error).toBeUndefined()
      expect(result.value).toEqual(payload)
    })

    test('accepts alphanumeric values when failed', () => {
      const payload = {
        reviewStatus: false,
        ratedOutput: 'ABC123',
        testedOutput: {
          rated: '1abc',
          low: 'abc1'
        },
        smokeEmissionOutput: {
          rated: '1a2',
          low: 'value123'
        }
      }

      const result = validate(payload)

      expect(result.error).toBeUndefined()
      expect(result.value).toEqual(payload)
    })

    test('accepts all supported value types when failed', () => {
      const payload = {
        reviewStatus: false,
        ratedOutput: 'abc',
        testedOutput: {
          rated: '-10.567',
          low: 'ABC123'
        },
        smokeEmissionOutput: {
          rated: '',
          low: '1abc'
        }
      }

      const result = validate(payload)

      expect(result.error).toBeUndefined()
      expect(result.value).toEqual(payload)
    })

    test('accepts null review status without measurements', () => {
      const payload = {
        reviewStatus: null
      }

      expect(validate(payload).error).toBeUndefined()
    })

    test('rejects unknown top-level properties', () => {
      const payload = {
        ...validPayload,
        unexpected: 'value'
      }

      expect(validate(payload).error).toBeDefined()
    })

    test('rejects unknown nested properties', () => {
      const payload = {
        ...validPayload,
        testedOutput: {
          rated: 5.1,
          low: 2.4,
          unexpected: 10
        }
      }

      expect(validate(payload).error).toBeDefined()
    })
  })

  describe('route configuration', () => {
    test('route is PATCH', () => {
      expect(updateTestReport.method).toBe('PATCH')
    })

    test('uses the frontend test-reports path', () => {
      expect(updateTestReport.path).toBe('/appliances/{id}/test-reports')
    })
  })
})
