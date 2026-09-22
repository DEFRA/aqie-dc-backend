import { beforeEach, describe, test, expect, vi } from 'vitest'

import { recordApplianceCheck } from '../record-appliance-check.js'
import { statusCodes } from '../../../common/constants/status-codes.js'

const { recordApplianceCheckMock } = vi.hoisted(() => ({
  recordApplianceCheckMock: vi.fn()
}))

vi.mock('../../../controllers/appliance-review-controller.js', () => ({
  recordApplianceCheck: recordApplianceCheckMock
}))

describe('PATCH /appliances/{id}/technical-review/checks', () => {
  let mockRequest
  let mockToolkit

  beforeEach(() => {
    recordApplianceCheckMock.mockReset()

    mockToolkit = {
      response: vi.fn((data) => ({
        code: vi.fn((code) => ({ ...data, statusCode: code }))
      }))
    }

    mockRequest = {
      params: { id: 'APP-123' },
      payload: { check: 'technicalDrawings', result: true },
      db: {},
      logger: { info: vi.fn(), error: vi.fn() }
    }
  })

  describe('handler', () => {
    test('returns 200 when the result is recorded', async () => {
      recordApplianceCheckMock.mockResolvedValue({ success: true, data: {} })

      const result = await recordApplianceCheck.handler(
        mockRequest,
        mockToolkit
      )

      expect(result.statusCode).toBe(statusCodes.ok)
    })

    test('passes the check and result through to the controller', async () => {
      recordApplianceCheckMock.mockResolvedValue({ success: true, data: {} })

      await recordApplianceCheck.handler(mockRequest, mockToolkit)

      expect(recordApplianceCheckMock).toHaveBeenCalledWith(
        mockRequest.db,
        'APP-123',
        'technicalDrawings',
        true,
        mockRequest.logger,
        undefined
      )
    })

    test('passes check-specific data when provided', async () => {
      recordApplianceCheckMock.mockResolvedValue({ success: true, data: {} })
      mockRequest.payload = {
        check: 'additionalConditions',
        result: true,
        data: {
          additionalConditions: 'Standard additional condition text'
        }
      }

      await recordApplianceCheck.handler(mockRequest, mockToolkit)

      expect(recordApplianceCheckMock).toHaveBeenCalledWith(
        mockRequest.db,
        'APP-123',
        'additionalConditions',
        true,
        mockRequest.logger,
        {
          additionalConditions: 'Standard additional condition text'
        }
      )
    })

    test('returns 404 when the appliance is not found', async () => {
      recordApplianceCheckMock.mockResolvedValue({ notFound: true })

      const result = await recordApplianceCheck.handler(
        mockRequest,
        mockToolkit
      )

      expect(result.statusCode).toBe(statusCodes.notFound)
    })

    test('returns 500 and logs on controller error', async () => {
      const error = new Error('Database error')
      recordApplianceCheckMock.mockRejectedValue(error)

      const result = await recordApplianceCheck.handler(
        mockRequest,
        mockToolkit
      )

      expect(result.isBoom).toBe(true)
      expect(result.output.statusCode).toBe(statusCodes.internalServerError)
      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        error,
        'Failed to record appliance check'
      )
    })
  })

  describe('payload validation', () => {
    const validate = (payload) =>
      recordApplianceCheck.options.validate.payload.validate(payload)

    test('accepts a passed documentation check', () => {
      expect(
        validate({ check: 'technicalDrawings', result: true }).error
      ).toBeUndefined()
    })

    test('accepts a failed check', () => {
      expect(
        validate({ check: 'testReports', result: false }).error
      ).toBeUndefined()
    })

    test('accepts null to clear a check', () => {
      expect(
        validate({ check: 'conformityMark', result: null }).error
      ).toBeUndefined()
    })

    test('requires data for permittedFuels listing check', () => {
      expect(
        validate({ check: 'permittedFuels', result: true }).error
      ).toBeDefined()
    })

    test('requires data for additionalConditions check', () => {
      expect(
        validate({ check: 'additionalConditions', result: true }).error
      ).toBeDefined()
    })

    test('accepts permittedFuels with check-specific data', () => {
      expect(
        validate({
          check: 'permittedFuels',
          result: true,
          data: {
            permittedFuels: 'Wood logs',
            isPermittedToBurnWood: true
          }
        }).error
      ).toBeUndefined()
    })

    test('accepts additionalConditions with check-specific data', () => {
      expect(
        validate({
          check: 'additionalConditions',
          result: true,
          data: {
            additionalConditions: 'Standard additional condition text'
          }
        }).error
      ).toBeUndefined()
    })

    test('rejects additionalConditions when it is not marked complete', () => {
      expect(
        validate({
          check: 'additionalConditions',
          result: false,
          data: {
            additionalConditions: 'Standard additional condition text'
          }
        }).error
      ).toBeDefined()
    })

    test('rejects empty additionalConditions text', () => {
      expect(
        validate({
          check: 'additionalConditions',
          result: true,
          data: {
            additionalConditions: '   '
          }
        }).error
      ).toBeDefined()
    })

    test('forbids data for checks that do not support extra payload', () => {
      expect(
        validate({
          check: 'technicalDrawings',
          result: true,
          data: {
            permittedFuels: 'Wood logs',
            isPermittedToBurnWood: true
          }
        }).error
      ).toBeDefined()
    })

    test('rejects an unknown check name', () => {
      expect(
        validate({ check: 'somethingElse', result: true }).error
      ).toBeDefined()
    })

    test('requires both fields', () => {
      expect(validate({ check: 'testReports' }).error).toBeDefined()
      expect(validate({ result: true }).error).toBeDefined()
    })

    test('rejects unknown keys', () => {
      const { error } = validate({
        check: 'testReports',
        result: true,
        'technicalReview.status': 'accepted'
      })

      expect(error).toBeDefined()
    })
  })

  describe('route configuration', () => {
    test('route is PATCH', () => {
      expect(recordApplianceCheck.method).toBe('PATCH')
    })

    test('path is the checks sub-resource', () => {
      expect(recordApplianceCheck.path).toBe(
        '/appliances/{id}/technical-review/checks'
      )
    })
  })
})
