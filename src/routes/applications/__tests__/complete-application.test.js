import Boom from '@hapi/boom'
import { beforeEach, describe, test, expect, vi } from 'vitest'
import { completeApplication } from '#src/routes/applications/complete-application.js'
import { statusCodes } from '#src/common/constants/status-codes.js'
import * as applicationsController from '#src/controllers/applications-controller.js'

// Mock the controller
vi.mock('#src/controllers/applications-controller.js', () => ({
  default: {},
  completeApplication: vi.fn()
}))

describe('PATCH /applications/{id}/complete', () => {
  let mockRequest
  let mockToolkit

  beforeEach(() => {
    vi.clearAllMocks()

    mockToolkit = {
      response: vi.fn(function (data) {
        return {
          data,
          code: vi.fn(function (code) {
            return { ...data, statusCode: code }
          })
        }
      })
    }

    mockRequest = {
      params: { id: 'APPLICATION-123' },
      payload: {
        reviewedBy: { name: 'Jane Doe', email: 'jane.doe@example.com' }
      },
      db: {},
      logger: { info: vi.fn(), error: vi.fn() }
    }
  })

  test('returns 200 when the application is completed', async () => {
    applicationsController.completeApplication.mockResolvedValue({
      success: true,
      data: { id: 'APPLICATION-123', status: 'complete' }
    })

    const result = await completeApplication.handler(mockRequest, mockToolkit)

    expect(result.statusCode).toBe(statusCodes.ok)
  })

  test('passes the payload through to the controller', async () => {
    applicationsController.completeApplication.mockResolvedValue({
      success: true,
      data: {}
    })

    await completeApplication.handler(mockRequest, mockToolkit)

    expect(applicationsController.completeApplication).toHaveBeenCalledWith(
      mockRequest.db,
      'APPLICATION-123',
      mockRequest.payload,
      mockRequest.logger
    )
  })

  test('returns 404 when the application does not exist', async () => {
    applicationsController.completeApplication.mockResolvedValue({
      success: false,
      notFound: true,
      message: 'Application not found'
    })

    const result = await completeApplication.handler(mockRequest, mockToolkit)

    expect(result.statusCode).toBe(statusCodes.notFound)
  })

  test('returns 409 when linked items have not all been reviewed', async () => {
    applicationsController.completeApplication.mockResolvedValue({
      success: false,
      incomplete: true,
      message:
        'Application cannot be completed until every item has been reviewed'
    })

    const result = await completeApplication.handler(mockRequest, mockToolkit)

    expect(result.statusCode).toBe(statusCodes.conflict)
  })

  test('rethrows Boom errors from the controller', async () => {
    const boomError = Boom.badRequest('bad request')
    applicationsController.completeApplication.mockRejectedValue(boomError)

    await expect(
      completeApplication.handler(mockRequest, mockToolkit)
    ).rejects.toThrow(boomError)
  })

  test('wraps unexpected errors in a Boom internal error', async () => {
    applicationsController.completeApplication.mockRejectedValue(
      new Error('boom')
    )

    const result = await completeApplication.handler(mockRequest, mockToolkit)

    expect(result.isBoom).toBe(true)
    expect(result.output.statusCode).toBe(statusCodes.internalServerError)
  })
})
