import Boom from '@hapi/boom'
import { beforeEach, describe, test, expect, vi } from 'vitest'
import { startApplication } from '#src/routes/applications/start-application.js'
import { statusCodes } from '#src/common/constants/status-codes.js'
import * as applicationsController from '#src/controllers/applications-controller.js'

// Mock the controller
vi.mock('#src/controllers/applications-controller.js', () => ({
  default: {},
  startApplication: vi.fn()
}))

describe('PATCH /applications/{id}/in-progress', () => {
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

  test('returns 200 when the application is set to in progress', async () => {
    applicationsController.startApplication.mockResolvedValue({
      success: true,
      data: { id: 'APPLICATION-123', status: 'in_progress' }
    })

    const result = await startApplication.handler(mockRequest, mockToolkit)

    expect(result.statusCode).toBe(statusCodes.ok)
  })

  test('passes the payload through to the controller', async () => {
    applicationsController.startApplication.mockResolvedValue({
      success: true,
      data: {}
    })

    await startApplication.handler(mockRequest, mockToolkit)

    expect(applicationsController.startApplication).toHaveBeenCalledWith(
      mockRequest.db,
      'APPLICATION-123',
      mockRequest.payload,
      mockRequest.logger
    )
  })

  test('returns 404 when the application does not exist', async () => {
    applicationsController.startApplication.mockResolvedValue({
      success: false,
      notFound: true,
      message: 'Application not found'
    })

    const result = await startApplication.handler(mockRequest, mockToolkit)

    expect(result.statusCode).toBe(statusCodes.notFound)
  })

  test('rethrows Boom errors from the controller', async () => {
    const boomError = Boom.badRequest('bad request')
    applicationsController.startApplication.mockRejectedValue(boomError)

    await expect(
      startApplication.handler(mockRequest, mockToolkit)
    ).rejects.toThrow(boomError)
  })

  test('wraps unexpected errors in a Boom internal error', async () => {
    applicationsController.startApplication.mockRejectedValue(new Error('boom'))

    const result = await startApplication.handler(mockRequest, mockToolkit)

    expect(result.isBoom).toBe(true)
    expect(result.output.statusCode).toBe(statusCodes.internalServerError)
  })
})
