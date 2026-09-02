import { beforeEach, describe, test, expect, vi } from 'vitest'

import { getApplianceReview } from '../get-appliance-review.js'
import { statusCodes } from '../../../common/constants/status-codes.js'

const { getApplianceReviewMock } = vi.hoisted(() => ({
  getApplianceReviewMock: vi.fn()
}))

vi.mock('../../controllers/appliance-review-controller.js', () => ({
  getApplianceReview: getApplianceReviewMock
}))

const applianceReview = {
  id: 'APP-123',
  modelName: 'Twin Heat M20i',
  applicationId: '1084',
  technicalReview: { status: 'in_review' },
  outstandingChecks: ['testReports']
}

describe('GET /appliances/{id}/technical-review', () => {
  let mockRequest
  let mockToolkit

  beforeEach(() => {
    getApplianceReviewMock.mockReset()

    mockToolkit = {
      response: vi.fn((data) => ({
        code: vi.fn((code) => ({ ...data, statusCode: code }))
      }))
    }

    mockRequest = {
      params: { id: 'APP-123' },
      db: {},
      logger: { info: vi.fn(), error: vi.fn() }
    }
  })

  describe('handler', () => {
    test('returns the review state when found', async () => {
      getApplianceReviewMock.mockResolvedValue({
        success: true,
        data: applianceReview
      })

      const result = await getApplianceReview.handler(mockRequest, mockToolkit)

      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ modelName: 'Twin Heat M20i' }),
          statusCode: statusCodes.ok
        })
      )
    })

    test('passes the id and logger through to the controller', async () => {
      getApplianceReviewMock.mockResolvedValue({ success: true, data: {} })

      await getApplianceReview.handler(mockRequest, mockToolkit)

      expect(getApplianceReviewMock).toHaveBeenCalledWith(
        mockRequest.db,
        'APP-123',
        mockRequest.logger
      )
    })

    test('returns 404 when the appliance is not found', async () => {
      getApplianceReviewMock.mockResolvedValue({
        success: false,
        message: 'Appliance not found',
        notFound: true
      })

      const result = await getApplianceReview.handler(mockRequest, mockToolkit)

      expect(result.statusCode).toBe(statusCodes.notFound)
    })

    test('returns 500 and logs on controller error', async () => {
      const error = new Error('Database error')
      getApplianceReviewMock.mockRejectedValue(error)

      const result = await getApplianceReview.handler(mockRequest, mockToolkit)

      expect(result.isBoom).toBe(true)
      expect(result.output.statusCode).toBe(statusCodes.internalServerError)
      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        error,
        'Failed to fetch appliance review'
      )
    })
  })

  describe('route configuration', () => {
    const validateParams = (params) =>
      getApplianceReview.options.validate.params.validate(params)

    test('route is GET', () => {
      expect(getApplianceReview.method).toBe('GET')
    })

    test('path includes the id parameter', () => {
      expect(getApplianceReview.path).toBe('/appliances/{id}/technical-review')
    })

    test('requires the id param', () => {
      expect(validateParams({}).error).toBeDefined()
    })

    test('accepts a valid id', () => {
      expect(validateParams({ id: 'APP-123' }).error).toBeUndefined()
    })

    test('rejects an id longer than 64 characters', () => {
      expect(validateParams({ id: 'x'.repeat(65) }).error).toBeDefined()
    })
  })
})
