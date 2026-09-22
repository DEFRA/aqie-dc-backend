import { describe, test, expect, vi, beforeEach } from 'vitest'
import Boom from '@hapi/boom'

import { getApplicationsWithSummary } from '#src/routes/applications/get-applications-with-summary.js'
import * as applicationsController from '#src/controllers/applications-controller.js'
import { statusCodes } from '#src/common/constants/status-codes.js'

vi.mock('#src/controllers/applications-controller.js')

describe('getApplicationsWithSummary route', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    vi.clearAllMocks()

    mockRequest = {
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

  test('returns applications summary successfully', async () => {
    const mockResult = {
      success: true,
      data: { new: [], inProgress: [] }
    }

    applicationsController.getApplicationsWithSummary.mockResolvedValue(
      mockResult
    )

    await getApplicationsWithSummary.handler(mockRequest, mockH)

    expect(
      applicationsController.getApplicationsWithSummary
    ).toHaveBeenCalledWith(mockRequest.db, mockRequest.logger, 'appliance')

    expect(mockH.response).toHaveBeenCalledWith(mockResult)
    expect(mockH.code).toHaveBeenCalledWith(statusCodes.ok)
  })

  test('returns bad request when controller returns notFound flag', async () => {
    applicationsController.getApplicationsWithSummary.mockResolvedValue({
      notFound: true,
      message: 'Unknown application type: other'
    })

    const result = await getApplicationsWithSummary.handler(
      mockRequest,
      mockH
    )

    expect(result.isBoom).toBe(true)
    expect(result.output.statusCode).toBe(400)
    expect(result.message).toBe('Unknown application type: other')
  })

  test('rethrows Boom errors', async () => {
    const boomError = Boom.badRequest('Invalid request')

    applicationsController.getApplicationsWithSummary.mockRejectedValue(
      boomError
    )

    await expect(
      getApplicationsWithSummary.handler(mockRequest, mockH)
    ).rejects.toThrow()
  })

  test('returns bad gateway when downstream service returns 500 error', async () => {
    const upstreamError = new Error('Service unavailable')
    upstreamError.status = 500

    applicationsController.getApplicationsWithSummary.mockRejectedValue(
      upstreamError
    )

    const result = await getApplicationsWithSummary.handler(
      mockRequest,
      mockH
    )

    expect(mockRequest.logger.error).toHaveBeenCalledWith(
      upstreamError,
      'Failed to fetch applications summary'
    )

    expect(result.isBoom).toBe(true)
    expect(result.output.statusCode).toBe(502)
  })

  test('returns internal server error for generic errors', async () => {
    const error = new Error('Unexpected failure')

    applicationsController.getApplicationsWithSummary.mockRejectedValue(error)

    const result = await getApplicationsWithSummary.handler(
      mockRequest,
      mockH
    )

    expect(result.isBoom).toBe(true)
    expect(result.output.statusCode).toBe(500)
    expect(result.message).toBe('Failed to fetch applications summary')
  })

  describe('route configuration', () => {
    test('uses GET method', () => {
      expect(getApplicationsWithSummary.method).toBe('GET')
    })

    test('has correct route path', () => {
      expect(getApplicationsWithSummary.path).toBe('/applications/summary')
    })

    test('requires type query parameter', () => {
      const schema = getApplicationsWithSummary.options.validate.query

      const { error } = schema.validate({})

      expect(error).toBeDefined()
    })

    test('accepts appliance as query type', () => {
      const schema = getApplicationsWithSummary.options.validate.query

      const { error } = schema.validate({ type: 'appliance' })

      expect(error).toBeUndefined()
    })

    test('accepts fuel as query type', () => {
      const schema = getApplicationsWithSummary.options.validate.query

      const { error } = schema.validate({ type: 'fuel' })

      expect(error).toBeUndefined()
    })

    test('rejects invalid query type', () => {
      const schema = getApplicationsWithSummary.options.validate.query

      const { error } = schema.validate({ type: 'invalid' })

      expect(error).toBeDefined()
    })
  })
})
