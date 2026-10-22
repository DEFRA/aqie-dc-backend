import { beforeEach, describe, test, expect, vi } from 'vitest'

import { updateFuelReview } from '../update-fuel-review.js'
import { statusCodes } from '../../../common/constants/status-codes.js'

const { updateFuelReviewMock } = vi.hoisted(() => ({
  updateFuelReviewMock: vi.fn()
}))

vi.mock('../../../controllers/fuel-review-controller.js', () => ({
  updateFuelReview: updateFuelReviewMock
}))

describe('PATCH /fuels/{fuelId}/technical-review', () => {
  let mockRequest
  let mockToolkit

  beforeEach(() => {
    updateFuelReviewMock.mockReset()

    mockToolkit = {
      response: vi.fn((data) => ({
        code: vi.fn((code) => ({ ...data, statusCode: code }))
      }))
    }

    mockRequest = {
      params: { fuelId: 'FUEL-123' },
      payload: { status: 'accepted' },
      db: {},
      logger: { info: vi.fn(), error: vi.fn() }
    }
  })

  describe('handler', () => {
    test('returns 200 when the decision is recorded', async () => {
      updateFuelReviewMock.mockResolvedValue({
        success: true,
        data: { fuelId: 'FUEL-123', status: 'accepted' }
      })

      const result = await updateFuelReview.handler(mockRequest, mockToolkit)

      expect(result.statusCode).toBe(statusCodes.ok)
    })

    test('passes the payload through to the controller', async () => {
      updateFuelReviewMock.mockResolvedValue({ success: true, data: {} })

      await updateFuelReview.handler(mockRequest, mockToolkit)

      expect(updateFuelReviewMock).toHaveBeenCalledWith(
        mockRequest.db,
        'FUEL-123',
        { status: 'accepted' },
        mockRequest.logger
      )
    })

    test('returns 404 when the fuel is not found', async () => {
      updateFuelReviewMock.mockResolvedValue({
        success: false,
        notFound: true
      })

      const result = await updateFuelReview.handler(mockRequest, mockToolkit)

      expect(result.statusCode).toBe(statusCodes.notFound)
    })

    test('returns 500 and logs on controller error', async () => {
      const error = new Error('Database error')
      updateFuelReviewMock.mockRejectedValue(error)

      const result = await updateFuelReview.handler(mockRequest, mockToolkit)

      expect(result.isBoom).toBe(true)
      expect(result.output.statusCode).toBe(statusCodes.internalServerError)
      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        error,
        'Failed to update fuel review'
      )
    })
  })

  describe('payload validation', () => {
    const validatePayload = (payload) =>
      updateFuelReview.options.validate.payload.validate(payload)

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
        'technicalReview.status': 'accepted'
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
      expect(updateFuelReview.method).toBe('PATCH')
    })

    test('path includes the fuelId parameter', () => {
      expect(updateFuelReview.path).toBe('/fuels/{fuelId}/technical-review')
    })
  })
})
