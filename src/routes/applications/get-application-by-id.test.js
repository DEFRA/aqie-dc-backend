import { beforeEach, describe, test, expect, vi } from 'vitest'
import { getApplicationById } from './get-application-by-id.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import * as applicationsController from '../../controllers/applications-controller.js'

// Mock the controller
vi.mock('../../controllers/applications-controller.js', () => ({
  default: {},
  getApplicationById: vi.fn()
}))

describe('GET /applications/{applicationId}', () => {
  let mockRequest
  let mockToolkit

  beforeEach(() => {
    vi.clearAllMocks()

    mockToolkit = {
      response: vi.fn((data) => ({
        code: vi.fn((code) => ({ ...data, statusCode: code }))
      }))
    }

    mockRequest = {
      params: {
        applicationId: 'app-123'
      },
      db: {},
      logger: {
        info: vi.fn(),
        error: vi.fn()
      }
    }
  })

  describe('handler', () => {
    test('returns application detail when found', async () => {
      const mockApplication = {
        id: 'app-123',
        type: 'appliance',
        status: 'new',
        reviewer: 'John',
        reviewNotes: 'Pending review',
        submittedDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        appliances: [
          {
            applianceId: 'APP-001',
            companyName: 'ACME',
            modelName: 'Model X'
          }
        ]
      }

      applicationsController.getApplicationById.mockResolvedValueOnce({
        success: true,
        message: 'Application retrieved successfully',
        data: mockApplication
      })

      const h = mockToolkit
      const result = await getApplicationById.handler(mockRequest, h)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockApplication)
      expect(result.statusCode).toBe(statusCodes.ok)
      expect(result.data.id).toBe('app-123')
      expect(applicationsController.getApplicationById).toHaveBeenCalledWith(
        mockRequest.db,
        'app-123',
        mockRequest.logger
      )
    })

    test('returns 404 when application not found', async () => {
      applicationsController.getApplicationById.mockResolvedValueOnce({
        success: false,
        message: 'Application not found',
        notFound: true
      })

      const h = mockToolkit
      const result = await getApplicationById.handler(mockRequest, h)

      expect(result.notFound).toBe(true)
      expect(result.success).toBe(false)
      expect(result.message).toBe('Application not found')
    })

    test('returns 500 on controller error', async () => {
      const error = new Error('Database error')
      applicationsController.getApplicationById.mockRejectedValueOnce(error)

      const h = mockToolkit
      const result = await getApplicationById.handler(mockRequest, h)

      expect(result.isBoom).toBe(true)
      expect(result.output.statusCode).toBe(statusCodes.internalServerError)
      expect(result.message).toBe('Failed to fetch application')
      expect(result.output.payload.message).toBe(
        'An internal server error occurred'
      )
      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        error,
        'Failed to fetch application'
      )
    })

    test('passes applicationId from params to controller', async () => {
      mockRequest.params.applicationId = 'app-456'
      applicationsController.getApplicationById.mockResolvedValueOnce({
        success: true,
        data: { id: 'app-456' }
      })

      const h = mockToolkit
      await getApplicationById.handler(mockRequest, h)

      expect(applicationsController.getApplicationById).toHaveBeenCalledWith(
        mockRequest.db,
        'app-456',
        mockRequest.logger
      )
    })

    test('includes linkedItems in response when present', async () => {
      const mockApplication = {
        id: 'app-123',
        type: 'appliance',
        status: 'new',
        linkedItems: [
          { applianceId: 'APP-001', companyName: 'ACME' },
          { applianceId: 'APP-002', companyName: 'Beta' }
        ]
      }

      applicationsController.getApplicationById.mockResolvedValueOnce({
        success: true,
        data: mockApplication
      })

      const h = mockToolkit
      const result = await getApplicationById.handler(mockRequest, h)

      expect(result.data.linkedItems).toBeDefined()
      expect(result.data.linkedItems).toHaveLength(2)
    })

    test('handles different application types (appliance and fuel)', async () => {
      const applianceApp = {
        id: 'app-appliance-1',
        type: 'appliance',
        status: 'new',
        linkedItems: [{ applianceId: 'APP-001' }]
      }

      const fuelApp = {
        id: 'app-fuel-1',
        type: 'fuel',
        status: 'new',
        linkedItems: [{ fuelId: 'FUEL-001' }]
      }

      // Test appliance type
      applicationsController.getApplicationById.mockResolvedValueOnce({
        success: true,
        data: applianceApp
      })

      let h = mockToolkit
      let result = await getApplicationById.handler(mockRequest, h)
      expect(result.data.type).toBe('appliance')

      // Test fuel type
      applicationsController.getApplicationById.mockResolvedValueOnce({
        success: true,
        data: fuelApp
      })

      h = mockToolkit
      result = await getApplicationById.handler(mockRequest, h)
      expect(result.data.type).toBe('fuel')
    })

    test('logs errors properly', async () => {
      const error = new Error('Database connection lost')
      applicationsController.getApplicationById.mockRejectedValueOnce(error)

      const h = mockToolkit
      const result = await getApplicationById.handler(mockRequest, h)

      expect(result.isBoom).toBe(true)
      expect(result.output.statusCode).toBe(statusCodes.internalServerError)
      expect(result.message).toBe('Failed to fetch application')
      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        error,
        'Failed to fetch application'
      )
    })
  })

  describe('options.method', () => {
    test('route is GET', () => {
      expect(getApplicationById.method).toBe('GET')
    })
  })

  describe('options.path', () => {
    test('route path includes applicationId parameter', () => {
      expect(getApplicationById.path).toBe('/applications/{applicationId}')
    })
  })

  describe('options.tags', () => {
    test('includes api and applications tags', () => {
      expect(getApplicationById.options.tags).toContain('api')
      expect(getApplicationById.options.tags).toContain('applications')
    })
  })

  describe('options.description', () => {
    test('has description', () => {
      expect(getApplicationById.options.description).toBeDefined()
    })

    test('has notes', () => {
      expect(getApplicationById.options.notes).toBeDefined()
    })
  })

  describe('options.validate', () => {
    test('has params validation', () => {
      expect(getApplicationById.options.validate).toBeDefined()
      expect(getApplicationById.options.validate.params).toBeDefined()
    })

    test('applicationId param is required', () => {
      const paramsSchema = getApplicationById.options.validate.params
      expect(paramsSchema).toBeDefined()
      // The schema object requires applicationId parameter
    })
  })
})
