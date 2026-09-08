import { describe, test, expect, vi, beforeEach } from 'vitest'
import Boom from '@hapi/boom'

import { getApplicationSummary } from './get-application-summary.js'
import * as applicationsController from '../../controllers/applications-controller.js'
import { statusCodes } from '../../common/constants/status-codes.js'

vi.mock('../../controllers/applications-controller.js')

describe('getApplicationSummary route', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    vi.clearAllMocks()

    mockRequest = {
      params: {
        applicationId: 'app-123'
      },
      query: {
        type: 'appliance'
      },
      db: {},
      logger: {
        error: vi.fn()
      }
    }

    mockH = {
      response: vi.fn().mockReturnThis(),
      code: vi.fn()
    }
  })

  test('returns application summary successfully', async () => {
    const mockResult = {
      applicationId: 'app-123',
      items: [
        {
          name: 'Appliance A',
          technicalReview: {
            status: 'accepted'
          }
        }
      ]
    }

    applicationsController.getApplicationSummaryById.mockResolvedValue(
      mockResult
    )

    await getApplicationSummary.handler(mockRequest, mockH)

    expect(
      applicationsController.getApplicationSummaryById
    ).toHaveBeenCalledWith(
      mockRequest.db,
      'app-123',
      'appliance',
      mockRequest.logger
    )

    expect(mockH.response).toHaveBeenCalledWith(mockResult)
    expect(mockH.code).toHaveBeenCalledWith(statusCodes.ok)
  })

  test('returns not found when controller returns notFound flag', async () => {
    applicationsController.getApplicationSummaryById.mockResolvedValue({
      notFound: true,
      message: 'Application not found'
    })

    const result = await getApplicationSummary.handler(mockRequest, mockH)

    expect(result.isBoom).toBe(true)
    expect(result.output.statusCode).toBe(404)
    expect(result.message).toBe('Application not found')
  })

  test('rethrows Boom errors', async () => {
    const boomError = Boom.badRequest('Invalid application id')

    applicationsController.getApplicationSummaryById.mockRejectedValue(
      boomError
    )

    await expect(
      getApplicationSummary.handler(mockRequest, mockH)
    ).rejects.toThrow()
  })

  test('returns bad gateway when downstream service returns 500 error', async () => {
    const upstreamError = new Error('Service unavailable')
    upstreamError.status = 500

    applicationsController.getApplicationSummaryById.mockRejectedValue(
      upstreamError
    )

    const result = await getApplicationSummary.handler(mockRequest, mockH)

    expect(mockRequest.logger.error).toHaveBeenCalledWith(
      upstreamError,
      'Failed to fetch application summary'
    )

    expect(result.isBoom).toBe(true)
    expect(result.output.statusCode).toBe(502)
    expect(result.message).toBe('Application service is currently unavailable')
  })

  test('returns bad gateway when downstream service returns 503 error', async () => {
    const upstreamError = new Error('Service unavailable')
    upstreamError.status = 503

    applicationsController.getApplicationSummaryById.mockRejectedValue(
      upstreamError
    )

    const result = await getApplicationSummary.handler(mockRequest, mockH)

    expect(mockRequest.logger.error).toHaveBeenCalledWith(
      upstreamError,
      'Failed to fetch application summary'
    )

    expect(result.isBoom).toBe(true)
    expect(result.output.statusCode).toBe(502)
    expect(result.message).toBe('Application service is currently unavailable')
  })

  test('returns internal server error for generic errors', async () => {
    const error = new Error('Unexpected failure')

    applicationsController.getApplicationSummaryById.mockRejectedValue(error)

    const result = await getApplicationSummary.handler(mockRequest, mockH)

    expect(mockRequest.logger.error).toHaveBeenCalledWith(
      error,
      'Failed to fetch application summary'
    )

    expect(result.isBoom).toBe(true)
    expect(result.output.statusCode).toBe(500)
    expect(result.message).toBe('Failed to fetch application summary')
  })

  test('returns internal server error when status is less than 500', async () => {
    const error = new Error('Bad request')
    error.status = 400

    applicationsController.getApplicationSummaryById.mockRejectedValue(error)

    const result = await getApplicationSummary.handler(mockRequest, mockH)

    expect(mockRequest.logger.error).toHaveBeenCalledWith(
      error,
      'Failed to fetch application summary'
    )

    expect(result.isBoom).toBe(true)
    expect(result.output.statusCode).toBe(500)
    expect(result.message).toBe('Failed to fetch application summary')
  })

  describe('route configuration', () => {
    test('uses GET method', () => {
      expect(getApplicationSummary.method).toBe('GET')
    })

    test('has correct route path', () => {
      expect(getApplicationSummary.path).toBe(
        '/applications/{applicationId}/summary'
      )
    })

    test('requires applicationId route parameter', () => {
      const schema = getApplicationSummary.options.validate.params

      const { error } = schema.validate({})

      expect(error).toBeDefined()
    })

    test('accepts valid applicationId route parameter', () => {
      const schema = getApplicationSummary.options.validate.params

      const { error } = schema.validate({
        applicationId: 'app-123'
      })

      expect(error).toBeUndefined()
    })

    test('requires type query parameter', () => {
      const schema = getApplicationSummary.options.validate.query

      const { error } = schema.validate({})

      expect(error).toBeDefined()
    })

    test('accepts appliance as query type', () => {
      const schema = getApplicationSummary.options.validate.query

      const { error } = schema.validate({
        type: 'appliance'
      })

      expect(error).toBeUndefined()
    })

    test('accepts fuel as query type', () => {
      const schema = getApplicationSummary.options.validate.query

      const { error } = schema.validate({
        type: 'fuel'
      })

      expect(error).toBeUndefined()
    })

    test('rejects invalid query type', () => {
      const schema = getApplicationSummary.options.validate.query

      const { error } = schema.validate({
        type: 'invalid'
      })

      expect(error).toBeDefined()
      expect(error.details[0].message).toContain('must be one of')
    })
  })
})
