import { beforeEach, describe, test, expect, vi } from 'vitest'

import { recordBrandNameCheck } from '../record-fuel-attribute-check.js'
import { statusCodes } from '../../../common/constants/status-codes.js'

const { recordFuelCheckMock } = vi.hoisted(() => ({
  recordFuelCheckMock: vi.fn()
}))

vi.mock('../../../controllers/fuel-review-controller.js', () => ({
  recordFuelCheck: recordFuelCheckMock
}))

describe('PATCH /fuels/{fuelId}/technical-review/{attribute}', () => {
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
      payload: {
        result: true,
        data: { brandName: 'Kings Starterlog' }
      },
      db: {},
      logger: { info: vi.fn(), error: vi.fn() }
    }
  })

  describe('brandName check', () => {
    test('calls controller with brandName data', async () => {
      recordFuelCheckMock.mockResolvedValue({ success: true, data: {} })

      const result = await recordBrandNameCheck.handler(
        mockRequest,
        mockToolkit
      )

      expect(result.statusCode).toBe(statusCodes.ok)
      expect(recordFuelCheckMock).toHaveBeenCalledWith(
        mockRequest.db,
        'FUEL-123',
        'brandName',
        true,
        mockRequest.logger,
        { brandName: 'Kings Starterlog' }
      )
    })

    test('returns 404 when fuel not found', async () => {
      recordFuelCheckMock.mockResolvedValue({
        success: false,
        notFound: true
      })

      const result = await recordBrandNameCheck.handler(
        mockRequest,
        mockToolkit
      )

      expect(result.statusCode).toBe(statusCodes.notFound)
    })

    test('returns 500 on controller error', async () => {
      const error = new Error('Database error')
      recordFuelCheckMock.mockRejectedValue(error)

      const result = await recordBrandNameCheck.handler(
        mockRequest,
        mockToolkit
      )

      expect(result.isBoom).toBe(true)
    })
  })

  describe('payload validation for brandName', () => {
    const validate = (payload) =>
      recordBrandNameCheck.options.validate.payload.validate(payload)

    test('requires brandName in data', () => {
      expect(
        validate({
          result: true,
          data: { brandName: 'Kings Starterlog' }
        }).error
      ).toBeUndefined()
    })

    test('rejects missing brandName', () => {
      expect(
        validate({
          result: true,
          data: {}
        }).error
      ).toBeDefined()
    })

    test('rejects empty brandName', () => {
      expect(
        validate({
          result: true,
          data: { brandName: '  ' }
        }).error
      ).toBeDefined()
    })

    test('accepts true, false, or null for result', () => {
      const testCases = [true, false, null]
      testCases.forEach((resultVal) => {
        expect(
          validate({
            result: resultVal,
            data: { brandName: 'Kings Starterlog' }
          }).error
        ).toBeUndefined()
      })
    })

    test('forbids extra fields', () => {
      expect(
        validate({
          result: true,
          data: { brandName: 'Kings Starterlog', extra: 'field' }
        }).error
      ).toBeDefined()
    })
  })
})
