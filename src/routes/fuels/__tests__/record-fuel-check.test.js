import { beforeEach, describe, test, expect, vi } from 'vitest'

import { recordFuelCheck } from '../record-fuel-check.js'
import { statusCodes } from '../../../common/constants/status-codes.js'

const { recordFuelCheckMock } = vi.hoisted(() => ({
  recordFuelCheckMock: vi.fn()
}))

vi.mock('../../../controllers/fuel-review-controller.js', () => ({
  recordFuelCheck: recordFuelCheckMock
}))

describe('PATCH /fuels/{fuelId}/technical-review/checks', () => {
  let mockRequest
  let mockToolkit

  beforeEach(() => {
    recordFuelCheckMock.mockReset()

    mockToolkit = {
      response: vi.fn((data) => ({
        code: vi.fn((code) => ({ ...data, statusCode: code }))
      }))
    }

    mockRequest = {
      params: { fuelId: 'FUEL-123' },
      payload: { check: 'manufacturerLetter', result: true },
      db: {},
      logger: { info: vi.fn(), error: vi.fn() }
    }
  })

  describe('handler', () => {
    test('returns 200 and passes arguments to the controller', async () => {
      recordFuelCheckMock.mockResolvedValue({ success: true, data: {} })

      const result = await recordFuelCheck.handler(mockRequest, mockToolkit)

      expect(result.statusCode).toBe(statusCodes.ok)
      expect(recordFuelCheckMock).toHaveBeenCalledWith(
        mockRequest.db,
        'FUEL-123',
        'manufacturerLetter',
        true,
        mockRequest.logger,
        undefined
      )
    })

    test('passes testResults data through to the controller', async () => {
      recordFuelCheckMock.mockResolvedValue({ success: true, data: {} })

      mockRequest.payload = {
        check: 'testResults',
        result: true,
        data: {
          testResults: {
            smokeEmission: 1.25,
            sulphurContent: 0.5
          }
        }
      }

      await recordFuelCheck.handler(mockRequest, mockToolkit)

      expect(recordFuelCheckMock).toHaveBeenCalledWith(
        mockRequest.db,
        'FUEL-123',
        'testResults',
        true,
        mockRequest.logger,
        {
          testResults: {
            smokeEmission: 1.25,
            sulphurContent: 0.5
          }
        }
      )
    })

    test('returns 404 when the fuel is not found', async () => {
      recordFuelCheckMock.mockResolvedValue({
        success: false,
        notFound: true
      })

      const result = await recordFuelCheck.handler(mockRequest, mockToolkit)

      expect(result.statusCode).toBe(statusCodes.notFound)
    })

    test('returns 500 and logs on controller error', async () => {
      const error = new Error('Database error')
      recordFuelCheckMock.mockRejectedValue(error)

      const result = await recordFuelCheck.handler(mockRequest, mockToolkit)

      expect(result.isBoom).toBe(true)
      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        error,
        'Failed to record fuel check'
      )
    })
  })

  describe('payload validation', () => {
    const validate = (payload) =>
      recordFuelCheck.options.validate.payload.validate(payload)

    test.each(['manufacturerLetter', 'fuelDetails', 'fuelDescription'])(
      'accepts the %s check without data',
      (check) => {
        expect(validate({ check, result: true }).error).toBeUndefined()
      }
    )

    test('rejects appliance-only checks', () => {
      expect(
        validate({ check: 'technicalDrawings', result: true }).error
      ).toBeDefined()
    })

    test('allows null for a check that can be unreviewed', () => {
      expect(
        validate({ check: 'fuelDetails', result: null }).error
      ).toBeUndefined()
    })

    test('does not allow null for testResults', () => {
      expect(
        validate({ check: 'testResults', result: null }).error
      ).toBeDefined()
    })

    test('requires a result', () => {
      expect(validate({ check: 'fuelDetails' }).error).toBeDefined()
    })

    describe('testResults with data', () => {
      test('requires data when testResults check', () => {
        const payload = {
          check: 'testResults',
          result: true
        }
        expect(validate(payload).error).toBeDefined()
      })

      test('accepts testResults data when passed (result: true)', () => {
        const payload = {
          check: 'testResults',
          result: true,
          data: {
            testResults: {
              smokeEmission: 1.25,
              sulphurContent: 0.5
            }
          }
        }
        expect(validate(payload).error).toBeUndefined()
      })

      test('requires both measurements when passed (result: true)', () => {
        const payloadMissingSmokeEmission = {
          check: 'testResults',
          result: true,
          data: {
            testResults: {
              sulphurContent: 0.5
            }
          }
        }
        expect(validate(payloadMissingSmokeEmission).error).toBeDefined()

        const payloadMissingSulphurContent = {
          check: 'testResults',
          result: true,
          data: {
            testResults: {
              smokeEmission: 1.25
            }
          }
        }
        expect(validate(payloadMissingSulphurContent).error).toBeDefined()
      })

      test('accepts optional testResults data when failed (result: false)', () => {
        const payload = {
          check: 'testResults',
          result: false,
          data: {
            testResults: {
              smokeEmission: null,
              sulphurContent: null
            }
          }
        }
        expect(validate(payload).error).toBeUndefined()
      })

      test('requires data field for testResults even when failed', () => {
        const payload = {
          check: 'testResults',
          result: false
        }
        expect(validate(payload).error).toBeDefined()
      })

      test('accepts partial testResults data when failed (result: false)', () => {
        const payload = {
          check: 'testResults',
          result: false,
          data: {
            testResults: {
              smokeEmission: 1.25
            }
          }
        }
        expect(validate(payload).error).toBeUndefined()
      })

      test('rejects negative measurements', () => {
        const payload = {
          check: 'testResults',
          result: true,
          data: {
            testResults: {
              smokeEmission: -1,
              sulphurContent: 0.5
            }
          }
        }
        expect(validate(payload).error).toBeDefined()
      })

      test('rejects sulphurContent > 100', () => {
        const payload = {
          check: 'testResults',
          result: true,
          data: {
            testResults: {
              smokeEmission: 1.25,
              sulphurContent: 101
            }
          }
        }
        expect(validate(payload).error).toBeDefined()
      })

      test('rejects non-numeric measurements', () => {
        const payload = {
          check: 'testResults',
          result: true,
          data: {
            testResults: {
              smokeEmission: 'not a number',
              sulphurContent: 0.5
            }
          }
        }
        expect(validate(payload).error).toBeDefined()
      })

      test('rejects data for non-testResults checks', () => {
        const payload = {
          check: 'manufacturerLetter',
          result: true,
          data: {
            testResults: {
              smokeEmission: 1.25,
              sulphurContent: 0.5
            }
          }
        }
        expect(validate(payload).error).toBeDefined()
      })

      test('allows no data field for testResults check', () => {
        const payload = {
          check: 'fuelDetails',
          result: false
        }
        expect(validate(payload).error).toBeUndefined()
      })
    })

    test('rejects unknown keys', () => {
      expect(
        validate({ check: 'fuelDetails', result: true, unknown: 'key' }).error
      ).toBeDefined()
    })
  })

  test('route configuration', () => {
    expect(recordFuelCheck.method).toBe('PATCH')
    expect(recordFuelCheck.path).toBe('/fuels/{fuelId}/technical-review/checks')
  })
})
