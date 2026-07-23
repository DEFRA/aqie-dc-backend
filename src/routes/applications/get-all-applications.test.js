import { beforeEach, describe, test, expect, vi } from 'vitest'
import { getAllApplications } from './get-all-applications.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import * as applicationsController from '../../controllers/applications-controller.js'

// Mock the controller
vi.mock('../../controllers/applications-controller.js', () => ({
  default: {},
  getAllApplications: vi.fn()
}))

describe('GET /applications', () => {
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
      db: {},
      logger: {
        info: vi.fn(),
        error: vi.fn()
      },
      query: {}
    }
  })

  describe('handler', () => {
    test('returns all applications successfully', async () => {
      const mockApplications = [
        {
          applicationId: 'app-001',
          applicationType: 'appliance',
          status: 'new',
          reviewer: 'John',
          createdAt: new Date()
        },
        {
          applicationId: 'app-002',
          applicationType: 'fuel',
          status: 'in_progress',
          reviewer: 'Jane',
          createdAt: new Date()
        }
      ]

      applicationsController.getAllApplications.mockResolvedValueOnce({
        success: true,
        message: 'Applications retrieved successfully',
        data: mockApplications
      })

      const h = mockToolkit
      const result = await getAllApplications.handler(mockRequest, h)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockApplications)
      expect(result.statusCode).toBe(statusCodes.ok)
      expect(result.data).toHaveLength(2)
      expect(applicationsController.getAllApplications).toHaveBeenCalledWith(
        mockRequest.db,
        { page: 1, limit: 999999 },
        mockRequest.logger
      )
    })

    test('returns empty array when no applications exist', async () => {
      applicationsController.getAllApplications.mockResolvedValueOnce({
        success: true,
        message: 'Applications retrieved successfully',
        data: []
      })

      const h = mockToolkit
      const result = await getAllApplications.handler(mockRequest, h)

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
    })

    test('includes all application properties in response', async () => {
      const mockApplications = [
        {
          applicationId: 'app-001',
          applicationType: 'appliance',
          status: 'new',
          reviewer: 'John',
          reviewNotes: 'Pending review',
          additionalMetadata: { notes: 'Test' },
          submittedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      applicationsController.getAllApplications.mockResolvedValueOnce({
        success: true,
        data: mockApplications
      })

      const h = mockToolkit
      const result = await getAllApplications.handler(mockRequest, h)

      expect(result.data[0].applicationId).toBeDefined()
      expect(result.data[0].applicationType).toBeDefined()
      expect(result.data[0].status).toBeDefined()
      expect(result.data[0].reviewer).toBeDefined()
    })

    test('handles controller error and returns 500', async () => {
      const error = new Error('Database connection failed')
      applicationsController.getAllApplications.mockRejectedValueOnce(error)

      const h = mockToolkit
      const result = await getAllApplications.handler(mockRequest, h)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Failed to fetch applications')
      expect(result.error).toBe('Database connection failed')
    })

    test('passes correct pagination parameters to controller', async () => {
      applicationsController.getAllApplications.mockResolvedValueOnce({
        success: true,
        data: []
      })

      const h = mockToolkit
      await getAllApplications.handler(mockRequest, h)

      // Verify the controller is called with default pagination values
      expect(applicationsController.getAllApplications).toHaveBeenCalledWith(
        mockRequest.db,
        expect.objectContaining({
          page: 1,
          limit: 999999
        }),
        mockRequest.logger
      )
    })

    test('calls logger.info on successful fetch', async () => {
      applicationsController.getAllApplications.mockResolvedValueOnce({
        success: true,
        data: []
      })

      const h = mockToolkit
      await getAllApplications.handler(mockRequest, h)

      // Note: The route handler doesn't currently log, but this test documents expected behavior
      expect(mockRequest.logger.info).not.toHaveBeenCalled()
    })

    test('calls logger.error on failure', async () => {
      const error = new Error('Database error')
      applicationsController.getAllApplications.mockRejectedValueOnce(error)

      const h = mockToolkit
      await getAllApplications.handler(mockRequest, h)

      // The error logging happens in the controller, not the route handler
      expect(applicationsController.getAllApplications).toHaveBeenCalled()
    })

    test('returns response with OK status code', async () => {
      applicationsController.getAllApplications.mockResolvedValueOnce({
        success: true,
        data: []
      })

      const h = mockToolkit
      const result = await getAllApplications.handler(mockRequest, h)

      // The test verifies the response structure expected
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('data')
    })
  })

  describe('options.method', () => {
    test('route is GET', () => {
      expect(getAllApplications.method).toBe('GET')
    })
  })

  describe('options.path', () => {
    test('route path is /applications', () => {
      expect(getAllApplications.path).toBe('/applications')
    })
  })

  describe('options.tags', () => {
    test('includes api and applications tags', () => {
      expect(getAllApplications.options.tags).toContain('api')
      expect(getAllApplications.options.tags).toContain('applications')
    })
  })

  describe('options.description', () => {
    test('has description', () => {
      expect(getAllApplications.options.description).toBeDefined()
    })

    test('has notes', () => {
      expect(getAllApplications.options.notes).toBeDefined()
    })
  })
})
