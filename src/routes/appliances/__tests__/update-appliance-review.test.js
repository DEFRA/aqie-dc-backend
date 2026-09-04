import { beforeEach, describe, test, expect, vi } from 'vitest'

import { updateApplianceReview } from '../update-appliance-review.js'
import { statusCodes } from '../../../common/constants/status-codes.js'

const { updateApplianceReviewMock } = vi.hoisted(() => ({
  updateApplianceReviewMock: vi.fn()
}))

vi.mock('../../../controllers/appliance-review-controller.js', () => ({
  updateApplianceReview: updateApplianceReviewMock
}))

describe('PATCH /appliances/{id}/technical-review', () => {
  let mockRequest
  let mockToolkit

  beforeEach(() => {
    updateApplianceReviewMock.mockReset()

    mockToolkit = {
      response: vi.fn((data) => ({
        code: vi.fn((code) => ({ ...data, statusCode: code }))
      }))
    }

    mockRequest = {
      params: { id: 'APP-123' },
      payload: { status: 'accepted' },
      db: {},
      logger: { info: vi.fn(), error: vi.fn() }
    }
  })

  describe('handler', () => {
    test('returns 200 when the decision is recorded', async () => {
      updateApplianceReviewMock.mockResolvedValue({
        success: true,
        data: { id: 'APP-123', status: 'accepted' }
      })

      const result = await updateApplianceReview.handler(
        mockRequest,
        mockToolkit
      )

      expect(result.statusCode).toBe(statusCodes.ok)
    })

    test('passes the payload through to the controller', async () => {
      updateApplianceReviewMock.mockResolvedValue({ success: true, data: {} })

      await updateApplianceReview.handler(mockRequest, mockToolkit)

      expect(updateApplianceReviewMock).toHaveBeenCalledWith(
        mockRequest.db,
        'APP-123',
        { status: 'accepted' },
        mockRequest.logger
      )
    })

    test('returns 409 with the outstanding checks when incomplete', async () => {
      updateApplianceReviewMock.mockResolvedValue({
        success: false,
        incomplete: true,
        outstandingChecks: ['testReports', 'permittedFuels']
      })

      const result = await updateApplianceReview.handler(
        mockRequest,
        mockToolkit
      )

      expect(result.statusCode).toBe(statusCodes.conflict)
      expect(result.outstandingChecks).toEqual([
        'testReports',
        'permittedFuels'
      ])
    })

    test('returns 404 when the appliance is not found', async () => {
      updateApplianceReviewMock.mockResolvedValue({
        success: false,
        notFound: true
      })

      const result = await updateApplianceReview.handler(
        mockRequest,
        mockToolkit
      )

      expect(result.statusCode).toBe(statusCodes.notFound)
    })

    test('returns 500 and logs on controller error', async () => {
      const error = new Error('Database error')
      updateApplianceReviewMock.mockRejectedValue(error)

      const result = await updateApplianceReview.handler(
        mockRequest,
        mockToolkit
      )

      expect(result.isBoom).toBe(true)
      expect(result.output.statusCode).toBe(statusCodes.internalServerError)
      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        error,
        'Failed to update appliance review'
      )
    })
  })

  describe('payload validation', () => {
    const validatePayload = (payload) =>
      updateApplianceReview.options.validate.payload.validate(payload)

    test('accepts an accepted decision', () => {
      expect(validatePayload({ status: 'accepted' }).error).toBeUndefined()
    })

    test('accepts a rejected decision', () => {
      expect(validatePayload({ status: 'rejected' }).error).toBeUndefined()
    })

    test('accepts a decision with a reviewer', () => {
      const { error } = validatePayload({
        status: 'accepted',
        reviewedBy: { name: 'A Reviewer', email: 'a@defra.gov.uk' }
      })

      expect(error).toBeUndefined()
    })

    test('rejects any other status', () => {
      expect(validatePayload({ status: 'in_review' }).error).toBeDefined()
    })

    test('requires a status', () => {
      expect(validatePayload({}).error).toBeDefined()
    })

    test('rejects unknown keys', () => {
      const { error } = validatePayload({
        status: 'accepted',
        'technicalReview.documentationChecks.testReports': true
      })

      expect(error).toBeDefined()
    })

    test('rejects a reviewer without a valid email', () => {
      const { error } = validatePayload({
        status: 'accepted',
        reviewedBy: { name: 'A Reviewer', email: 'not-an-email' }
      })

      expect(error).toBeDefined()
    })
  })

  describe('route configuration', () => {
    test('route is PATCH', () => {
      expect(updateApplianceReview.method).toBe('PATCH')
    })

    test('path includes the id parameter', () => {
      expect(updateApplianceReview.path).toBe(
        '/appliances/{id}/technical-review'
      )
    })
  })
})
