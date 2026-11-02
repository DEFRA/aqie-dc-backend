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

    test('requires data for fuelDetails', () => {
      expect(
        validate({ check: 'fuelDetails', result: true }).error
      ).toBeDefined()
    })

    test.each([false, null])('rejects fuelDetails result %s', (result) => {
      expect(
        validate({
          check: 'fuelDetails',
          result,
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

    describe('fuelDetails data', () => {
      const payload = (data) => ({ check: 'fuelDetails', result: true, data })

      test('accepts brand names and quality control', () => {
        expect(
          validate(
            payload({
              brandName: 'Kings Starterlog',
              hasAdditionalBrandNames: true,
              additionalBrandNames: 'One, Two',
              hasQualityControlSystem: true
            })
          ).error
        ).toBeUndefined()
      })

      test('accepts Manufacture fields with the description', () => {
        expect(
          validate(
            payload({
              brandName: 'Kings Starterlog',
              hasAdditionalBrandNames: false,
              hasQualityControlSystem: true,
              manufacturingProcess: 'Extrusion',
              fuelDescription: {
                appearance: 'Firelogs',
                weight: '600 grams',
                composition: 'Wax and sawdust',
                sulphurContent: 0.1
              }
            })
          ).error
        ).toBeUndefined()
      })

      test.each([[null], [''], [undefined]])(
        'accepts additionalBrandNames %j when the answer is No',
        (additionalBrandNames) => {
          expect(
            validate(
              payload({
                brandName: 'B',
                hasAdditionalBrandNames: false,
                additionalBrandNames
              })
            ).error
          ).toBeUndefined()
        }
      )

      test.each([
        [{ brandName: '  ', hasAdditionalBrandNames: false }],
        [{ brandName: 'B' }],
        [{ brandName: 'B', hasAdditionalBrandNames: 'yes' }],
        [{ brandName: 'B', hasAdditionalBrandNames: true }],
        [
          {
            brandName: 'B',
            hasAdditionalBrandNames: true,
            additionalBrandNames: ' '
          }
        ],
        [
          {
            brandName: 'B',
            hasAdditionalBrandNames: false,
            additionalBrandNames: 'x'
          }
        ],
        [
          {
            brandName: 'B',
            hasAdditionalBrandNames: false,
            hasQualityControlSystem: 'yes'
          }
        ],
        [{ brandName: 'B', hasAdditionalBrandNames: false, weight: '20' }],
        [{}]
      ])('rejects %j', (data) => {
        expect(validate(payload(data)).error).toBeDefined()
      })
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
      const description = {
        appearance: 'Briquettes',
        weight: '20',
        composition: 'Wood 100%',
        sulphurContent: 0.7
      }
      const payload = (result, fuelDescription) => ({
        check: 'fuelDescription',
        result,
        data: { fuelDescription, manufacturingProcess: 'Extrusion' }
      })

      test('accepts a complete description', () => {
        expect(validate(payload(true, description)).error).toBeUndefined()
      })

      test.each(['appearance', 'weight', 'composition', 'sulphurContent'])(
        'requires %s',
        (field) => {
          const { [field]: _omitted, ...rest } = description
          expect(validate(payload(true, rest)).error).toBeDefined()
        }
      )

      test('rejects sulphurContent outside 0-100', () => {
        expect(
          validate(payload(true, { ...description, sulphurContent: 101 })).error
        ).toBeDefined()
        expect(
          validate(payload(true, { ...description, sulphurContent: -1 })).error
        ).toBeDefined()
      })

      test('rejects a numeric weight', () => {
        expect(
          validate(payload(true, { ...description, weight: 20 })).error
        ).toBeDefined()
      })

      test.each([false, null])('rejects result %s', (result) => {
        expect(validate(payload(result, description)).error).toBeDefined()
      })

      test('rejects blank text', () => {
        expect(
          validate(payload(true, { ...description, appearance: '  ' })).error
        ).toBeDefined()
      })

      test('requires manufacturingProcess', () => {
        expect(
          validate({
            check: 'fuelDescription',
            result: true,
            data: { fuelDescription: description }
          }).error
        ).toBeDefined()
        expect(
          validate({
            check: 'fuelDescription',
            result: true,
            data: { fuelDescription: description, manufacturingProcess: ' ' }
          }).error
        ).toBeDefined()
      })

      test('requires data', () => {
        expect(
          validate({ check: 'fuelDescription', result: true }).error
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
