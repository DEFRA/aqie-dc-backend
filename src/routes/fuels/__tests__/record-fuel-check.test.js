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

    test('accepts the manufacturerLetter check without data', () => {
      expect(
        validate({ check: 'manufacturerLetter', result: true }).error
      ).toBeUndefined()
    })

    test('accepts fuelDetails without data', () => {
      expect(
        validate({ check: 'fuelDetails', result: true }).error
      ).toBeUndefined()
    })

    test.each([true, false, null])(
      'accepts fuelDetails result %s',
      (result) => {
        expect(
          validate({
            check: 'fuelDetails',
            result
          }).error
        ).toBeUndefined()
      }
    )

    test('rejects fuelDetails with data', () => {
      expect(
        validate({
          check: 'fuelDetails',
          result: true,
          data: { brandName: 'B', hasAdditionalBrandNames: false }
        }).error
      ).toBeDefined()
    })

    test('rejects appliance-only checks', () => {
      expect(
        validate({ check: 'technicalDrawings', result: true }).error
      ).toBeDefined()
    })

    test('allows null for a check that can be unreviewed', () => {
      expect(
        validate({ check: 'manufacturerLetter', result: null }).error
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
    })

    test('forbids data for checks that do not accept it', () => {
      expect(
        validate({
          check: 'manufacturerLetter',
          result: true,
          data: { anything: 1 }
        }).error
      ).toBeDefined()
    })

    describe('manufacturerLetter', () => {
      test.each([true, false, null])('accepts result %s', (result) => {
        expect(
          validate({ check: 'manufacturerLetter', result }).error
        ).toBeUndefined()
      })

      test('rejects a non-boolean result', () => {
        expect(
          validate({ check: 'manufacturerLetter', result: 'yes' }).error
        ).toBeDefined()
      })

      test('forbids data', () => {
        expect(
          validate({
            check: 'manufacturerLetter',
            result: true,
            data: { anything: 1 }
          }).error
        ).toBeDefined()
      })
    })

    describe('fuelDescription', () => {
      test('accepts result true without data', () => {
        expect(
          validate({ check: 'fuelDescription', result: true }).error
        ).toBeUndefined()
      })

      test.each([false, null])('rejects result %s', (result) => {
        expect(
          validate({ check: 'fuelDescription', result }).error
        ).toBeDefined()
      })

      test('forbids data', () => {
        expect(
          validate({
            check: 'fuelDescription',
            result: true,
            data: { manufacturingProcess: 'Extrusion' }
          }).error
        ).toBeDefined()
      })
    })

    test('rejects unknown keys', () => {
      expect(
        validate({
          check: 'manufacturerLetter',
          result: true,
          unknown: 'key'
        }).error
      ).toBeDefined()
    })
  })

  test('route configuration', () => {
    expect(recordFuelCheck.method).toBe('PATCH')
    expect(recordFuelCheck.path).toBe('/fuels/{fuelId}/technical-review/checks')
  })
})
