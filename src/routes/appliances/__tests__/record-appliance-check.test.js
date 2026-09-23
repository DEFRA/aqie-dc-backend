import Boom from '@hapi/boom'
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
      payload: {
        check: 'technicalDrawings',
        result: true
      },
      db: {},
      logger: {
        info: vi.fn(),
        error: vi.fn()
      }
    }
  })

  describe('handler', () => {
    test('returns 200 when the result is recorded', async () => {
      const outcome = {
        success: true,
        data: {
          id: 'APP-123',
          check: 'technicalDrawings',
          result: true
        }
      }

      recordApplianceCheckMock.mockResolvedValue(outcome)

      const result = await recordApplianceCheck.handler(
        mockRequest,
        mockToolkit
      )

      expect(mockToolkit.response).toHaveBeenCalledWith(outcome)
      expect(result.statusCode).toBe(statusCodes.ok)
    })

    test('passes the check and result through to the controller', async () => {
      recordApplianceCheckMock.mockResolvedValue({
        success: true,
        data: {}
      })

      await recordApplianceCheck.handler(mockRequest, mockToolkit)

      expect(recordApplianceCheckMock).toHaveBeenCalledTimes(1)
      expect(recordApplianceCheckMock).toHaveBeenCalledWith(
        mockRequest.db,
        'APP-123',
        'technicalDrawings',
        true,
        mockRequest.logger,
        undefined
      )
    })

    test('passes additional conditions data through to the controller', async () => {
      recordApplianceCheckMock.mockResolvedValue({
        success: true,
        data: {}
      })

      mockRequest.payload = {
        check: 'additionalConditions',
        result: true,
        data: {
          additionalConditions: 'Standard additional condition text'
        }
      }

      await recordApplianceCheck.handler(mockRequest, mockToolkit)

      expect(recordApplianceCheckMock).toHaveBeenCalledTimes(1)
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

    test('passes edited additional conditions text through to the controller', async () => {
      recordApplianceCheckMock.mockResolvedValue({
        success: true,
        data: {
          id: 'APP-123',
          check: 'additionalConditions',
          result: true
        }
      })

      mockRequest.payload = {
        check: 'additionalConditions',
        result: true,
        data: {
          additionalConditions: 'Edited additional condition text'
        }
      }

      const result = await recordApplianceCheck.handler(
        mockRequest,
        mockToolkit
      )

      expect(recordApplianceCheckMock).toHaveBeenCalledWith(
        mockRequest.db,
        'APP-123',
        'additionalConditions',
        true,
        mockRequest.logger,
        {
          additionalConditions: 'Edited additional condition text'
        }
      )

      expect(result.statusCode).toBe(statusCodes.ok)
    })

    test('returns 404 when the appliance is not found', async () => {
      const outcome = {
        success: false,
        notFound: true,
        message: 'Appliance not found'
      }

      recordApplianceCheckMock.mockResolvedValue(outcome)

      const result = await recordApplianceCheck.handler(
        mockRequest,
        mockToolkit
      )

      expect(mockToolkit.response).toHaveBeenCalledWith(outcome)
      expect(result.statusCode).toBe(statusCodes.notFound)
    })

    test('returns 500 and logs when the controller throws a non-Boom error', async () => {
      const error = new Error('Database error')

      recordApplianceCheckMock.mockRejectedValue(error)

      const result = await recordApplianceCheck.handler(
        mockRequest,
        mockToolkit
      )

      expect(result.isBoom).toBe(true)
      expect(result.output.statusCode).toBe(statusCodes.internalServerError)
      expect(result.message).toBe('Failed to record appliance check')

      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        error,
        'Failed to record appliance check'
      )
    })

    test('logs and rethrows a Boom error from the controller', async () => {
      const error = Boom.badRequest(
        'Additional conditions must be marked complete and include text'
      )

      recordApplianceCheckMock.mockRejectedValue(error)

      await expect(
        recordApplianceCheck.handler(mockRequest, mockToolkit)
      ).rejects.toBe(error)

      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        error,
        'Failed to record appliance check'
      )

      expect(mockToolkit.response).not.toHaveBeenCalled()
    })
  })

  describe('payload validation', () => {
    const validate = (payload) =>
      recordApplianceCheck.options.validate.payload.validate(payload)

    test('accepts a passed documentation check', () => {
      const { error } = validate({
        check: 'technicalDrawings',
        result: true
      })

      expect(error).toBeUndefined()
    })

    test('accepts false for a normal documentation check', () => {
      const { error } = validate({
        check: 'testReports',
        result: false
      })

      expect(error).toBeUndefined()
    })

    test('accepts null for a normal documentation check', () => {
      const { error } = validate({
        check: 'conformityMark',
        result: null
      })

      expect(error).toBeUndefined()
    })

    test('requires data for permittedFuels listing check', () => {
      const { error } = validate({
        check: 'permittedFuels',
        result: true
      })

      expect(error).toBeDefined()
    })

    test('requires data for additionalConditions check', () => {
      const { error } = validate({
        check: 'additionalConditions',
        result: true
      })

      expect(error).toBeDefined()
    })

    test('accepts permittedFuels with valid check-specific data', () => {
      const { error, value } = validate({
        check: 'permittedFuels',
        result: true,
        data: {
          permittedFuels: 'Wood logs',
          isPermittedToBurnWood: true
        }
      })

      expect(error).toBeUndefined()
      expect(value.data).toEqual({
        permittedFuels: 'Wood logs',
        isPermittedToBurnWood: true
      })
    })

    test('accepts permittedFuels with null isPermittedToBurnWood', () => {
      const { error } = validate({
        check: 'permittedFuels',
        result: true,
        data: {
          permittedFuels: 'Wood logs',
          isPermittedToBurnWood: null
        }
      })

      expect(error).toBeUndefined()
    })

    test('accepts result true with valid additional conditions text', () => {
      const { error, value } = validate({
        check: 'additionalConditions',
        result: true,
        data: {
          additionalConditions: 'Standard additional condition text'
        }
      })

      expect(error).toBeUndefined()
      expect(value).toEqual({
        check: 'additionalConditions',
        result: true,
        data: {
          additionalConditions: 'Standard additional condition text'
        }
      })
    })

    test('accepts edited additional conditions text', () => {
      const { error, value } = validate({
        check: 'additionalConditions',
        result: true,
        data: {
          additionalConditions: 'Edited additional condition text'
        }
      })

      expect(error).toBeUndefined()
      expect(value.data.additionalConditions).toBe(
        'Edited additional condition text'
      )
    })

    test('trims valid additional conditions text', () => {
      const { error, value } = validate({
        check: 'additionalConditions',
        result: true,
        data: {
          additionalConditions: '  Valid additional condition text  '
        }
      })

      expect(error).toBeUndefined()
      expect(value.data.additionalConditions).toBe(
        'Valid additional condition text'
      )
    })

    test.each([
      ['an empty string', ''],
      ['whitespace-only text', '   ']
    ])('rejects additional conditions containing %s', (_, value) => {
      const { error } = validate({
        check: 'additionalConditions',
        result: true,
        data: {
          additionalConditions: value
        }
      })

      expect(error).toBeDefined()
    })

    test('rejects missing additionalConditions property', () => {
      const { error } = validate({
        check: 'additionalConditions',
        result: true,
        data: {}
      })

      expect(error).toBeDefined()
    })

    test('rejects result false for additional conditions', () => {
      const { error } = validate({
        check: 'additionalConditions',
        result: false,
        data: {
          additionalConditions: 'Valid additional condition text'
        }
      })

      expect(error).toBeDefined()
    })

    test('rejects result null for additional conditions', () => {
      const { error } = validate({
        check: 'additionalConditions',
        result: null,
        data: {
          additionalConditions: 'Valid additional condition text'
        }
      })

      expect(error).toBeDefined()
    })

    test('rejects additional conditions exceeding the maximum length', () => {
      const { error } = validate({
        check: 'additionalConditions',
        result: true,
        data: {
          additionalConditions: 'a'.repeat(1001)
        }
      })

      expect(error).toBeDefined()
    })

    test('accepts additional conditions at the maximum length', () => {
      const { error } = validate({
        check: 'additionalConditions',
        result: true,
        data: {
          additionalConditions: 'a'.repeat(1000)
        }
      })

      expect(error).toBeUndefined()
    })

    test('rejects unknown properties inside additional conditions data', () => {
      const { error } = validate({
        check: 'additionalConditions',
        result: true,
        data: {
          additionalConditions: 'Valid additional condition text',
          unexpectedProperty: 'not allowed'
        }
      })

      expect(error).toBeDefined()
    })

    test('forbids data for checks that do not support extra payload', () => {
      const { error } = validate({
        check: 'technicalDrawings',
        result: true,
        data: {
          permittedFuels: 'Wood logs',
          isPermittedToBurnWood: true
        }
      })

      expect(error).toBeDefined()
    })

    test('rejects an unknown check name', () => {
      const { error } = validate({
        check: 'somethingElse',
        result: true
      })

      expect(error).toBeDefined()
    })

    test('requires the check property', () => {
      const { error } = validate({
        result: true
      })

      expect(error).toBeDefined()
    })

    test('requires the result property', () => {
      const { error } = validate({
        check: 'testReports'
      })

      expect(error).toBeDefined()
    })

    test('rejects unknown payload properties', () => {
      const { error } = validate({
        check: 'testReports',
        result: true,
        'technicalReview.status': 'accepted'
      })

      expect(error).toBeDefined()
    })
  })

  describe('params validation', () => {
    const validate = (params) =>
      recordApplianceCheck.options.validate.params.validate(params)

    test('accepts a valid appliance id', () => {
      const { error } = validate({
        id: 'APP-123'
      })

      expect(error).toBeUndefined()
    })

    test('requires an appliance id', () => {
      const { error } = validate({})

      expect(error).toBeDefined()
    })

    test('rejects an appliance id longer than 64 characters', () => {
      const { error } = validate({
        id: 'A'.repeat(65)
      })

      expect(error).toBeDefined()
    })

    test('accepts an appliance id containing 64 characters', () => {
      const { error } = validate({
        id: 'A'.repeat(64)
      })

      expect(error).toBeUndefined()
    })
  })

  describe('route configuration', () => {
    test('route uses PATCH', () => {
      expect(recordApplianceCheck.method).toBe('PATCH')
    })

    test('route uses the technical-review checks path', () => {
      expect(recordApplianceCheck.path).toBe(
        '/appliances/{id}/technical-review/checks'
      )
    })

    test('route contains the expected API tags', () => {
      expect(recordApplianceCheck.options.tags).toEqual(['api', 'appliances'])
    })
  })
})
