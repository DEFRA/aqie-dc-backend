import { beforeEach, describe, test, expect, vi } from 'vitest'

import { getFuelReview } from '../get-fuel-review.js'
import { statusCodes } from '../../../common/constants/status-codes.js'

const { getFuelReviewMock } = vi.hoisted(() => ({
  getFuelReviewMock: vi.fn()
}))

vi.mock('../../../controllers/fuel-review-controller.js', () => ({
  getFuelReview: getFuelReviewMock
}))

describe('GET /fuels/{fuelId}/technical-review', () => {
  let mockRequest
  let mockToolkit

  beforeEach(() => {
    getFuelReviewMock.mockReset()

    mockToolkit = {
      response: vi.fn((data) => ({
        code: vi.fn((code) => ({ ...data, statusCode: code }))
      }))
    }

    mockRequest = {
      params: { fuelId: 'FUEL-1' },
      db: {},
      logger: { info: vi.fn(), error: vi.fn() }
    }
  })

  test('returns the review state when found', async () => {
    getFuelReviewMock.mockResolvedValue({
      success: true,
      data: { id: 'FUEL-1', outstandingChecks: [] }
    })

    const result = await getFuelReview.handler(mockRequest, mockToolkit)

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        statusCode: statusCodes.ok
      })
    )
  })

  test('passes the fuelId and logger through to the controller', async () => {
    getFuelReviewMock.mockResolvedValue({ success: true, data: {} })

    await getFuelReview.handler(mockRequest, mockToolkit)

    expect(getFuelReviewMock).toHaveBeenCalledWith(
      mockRequest.db,
      'FUEL-1',
      mockRequest.logger
    )
  })

  test('returns 404 when the fuel is not found', async () => {
    getFuelReviewMock.mockResolvedValue({
      success: false,
      message: 'Fuel not found',
      notFound: true
    })

    const result = await getFuelReview.handler(mockRequest, mockToolkit)

    expect(result.statusCode).toBe(statusCodes.notFound)
  })

  test('returns 500 and logs on controller error', async () => {
    const error = new Error('Database error')
    getFuelReviewMock.mockRejectedValue(error)

    const result = await getFuelReview.handler(mockRequest, mockToolkit)

    expect(result.isBoom).toBe(true)
    expect(result.output.statusCode).toBe(statusCodes.internalServerError)
    expect(mockRequest.logger.error).toHaveBeenCalledWith(
      error,
      'Failed to fetch fuel review'
    )
  })

  test('route is GET on the technical-review path', () => {
    expect(getFuelReview.method).toBe('GET')
    expect(getFuelReview.path).toBe('/fuels/{fuelId}/technical-review')
  })

  test('requires the fuelId param', () => {
    expect(
      getFuelReview.options.validate.params.validate({}).error
    ).toBeDefined()
    expect(
      getFuelReview.options.validate.params.validate({ fuelId: 'FUEL-1' }).error
    ).toBeUndefined()
  })
})
