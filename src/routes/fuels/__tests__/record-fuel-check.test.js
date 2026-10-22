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
        mockRequest.logger
      )
    })

    test('returns 404 when the fuel is not found', async () => {
      recordFuelCheckMock.mockResolvedValue({ success: false, notFound: true })

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

    test.each([
      'manufacturerLetter',
      'testResults',
      'fuelDetails',
      'fuelDescription'
    ])('accepts the %s check', (check) => {
      expect(validate({ check, result: true }).error).toBeUndefined()
    })

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

    test('rejects unknown keys', () => {
      expect(
        validate({ check: 'fuelDetails', result: true, data: {} }).error
      ).toBeDefined()
    })
  })

  test('route configuration', () => {
    expect(recordFuelCheck.method).toBe('PATCH')
    expect(recordFuelCheck.path).toBe('/fuels/{fuelId}/technical-review/checks')
  })
})
