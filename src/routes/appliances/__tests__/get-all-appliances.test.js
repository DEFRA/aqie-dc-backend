import { beforeEach, describe, test, expect, vi } from 'vitest'
import { getAllAppliances } from '../get-all-appliances.js'
import { statusCodes } from '../../../common/constants/status-codes.js'
import * as applianceController from '../../../controllers/appliances-controller.js'

// Mock the controller
vi.mock('../../controllers/appliances-controller.js', () => ({
  default: {},
  getAllAppliances: vi.fn()
}))

describe('GET /appliances', () => {
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
    test('returns all appliances successfully', async () => {
      const mockAppliances = [
        {
          name: 'Model X',
          id: 'APP-001',
          manufacturer: 'ACME',
          type: 'boiler'
        },
        {
          name: 'Model Y',
          id: 'APP-002',
          manufacturer: 'TechCorp',
          type: 'furnace'
        }
      ]

      applianceController.getAllAppliances.mockResolvedValueOnce({
        success: true,
        data: mockAppliances
      })

      const h = mockToolkit
      const result = await getAllAppliances.handler(mockRequest, h)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockAppliances)
      expect(result.statusCode).toBe(statusCodes.ok)
      expect(applianceController.getAllAppliances).toHaveBeenCalledWith(
        mockRequest.db,
        { page: 1, limit: 999999 },
        mockRequest.logger
      )
    })

    test('returns empty array when no appliances exist', async () => {
      applianceController.getAllAppliances.mockResolvedValueOnce({
        success: true,
        data: []
      })

      const h = mockToolkit
      const result = await getAllAppliances.handler(mockRequest, h)

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
    })

    test('handles controller error and returns 500', async () => {
      const error = new Error('Database connection failed')
      applianceController.getAllAppliances.mockRejectedValueOnce(error)

      const h = mockToolkit
      const result = await getAllAppliances.handler(mockRequest, h)

      expect(result.isBoom).toBe(true)
      expect(result.output.statusCode).toBe(statusCodes.internalServerError)
      expect(result.message).toBe('Failed to fetch appliances')
      expect(result.output.payload.message).toBe(
        'An internal server error occurred'
      )
      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        error,
        'Failed to fetch appliances'
      )
    })

    test('passes default pagination params to controller', async () => {
      applianceController.getAllAppliances.mockResolvedValueOnce({
        success: true,
        data: []
      })

      const h = mockToolkit
      await getAllAppliances.handler(mockRequest, h)

      expect(applianceController.getAllAppliances).toHaveBeenCalledWith(
        expect.anything(),
        { page: 1, limit: 999999 },
        expect.anything()
      )
    })

    test('logs errors to request.logger', async () => {
      const error = new Error('Test error')
      applianceController.getAllAppliances.mockRejectedValueOnce(error)

      const h = mockToolkit
      await getAllAppliances.handler(mockRequest, h)

      expect(mockRequest.logger.error).toHaveBeenCalled()
    })
  })

  describe('options.method', () => {
    test('route is GET', () => {
      expect(getAllAppliances.method).toBe('GET')
    })
  })

  describe('options.path', () => {
    test('route path is /appliances', () => {
      expect(getAllAppliances.path).toBe('/appliances')
    })
  })

  describe('options.tags', () => {
    test('includes api and appliances tags', () => {
      expect(getAllAppliances.options.tags).toContain('api')
      expect(getAllAppliances.options.tags).toContain('appliances')
    })
  })

  describe('options.description', () => {
    test('has description', () => {
      expect(getAllAppliances.options.description).toBeDefined()
    })
  })

  describe('options.notes', () => {
    test('has notes about certified appliances', () => {
      expect(getAllAppliances.options.notes).toBeDefined()
    })
  })
})
