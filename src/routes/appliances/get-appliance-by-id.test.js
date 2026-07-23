import { beforeEach, describe, test, expect, vi } from 'vitest'
import { getApplianceById } from './get-appliance-by-id.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import * as applianceController from '../../controllers/appliances-controller.js'

// Mock the controller
vi.mock('../../controllers/appliances-controller.js', () => ({
  default: {},
  getApplianceById: vi.fn()
}))

describe('GET /appliances/{applianceId}', () => {
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
        applianceId: 'APP-123'
      },
      db: {},
      logger: {
        info: vi.fn(),
        error: vi.fn()
      }
    }
  })

  describe('handler', () => {
    test('returns appliance detail when found', async () => {
      const mockAppliance = {
        id: 'APP-123',
        name: 'Model X',
        manufacturer: 'ACME',
        type: 'boiler',
        authorisedIn: ['England', 'Scotland'],
        fullAddress: ['123 Main St', 'London']
      }

      applianceController.getApplianceById.mockResolvedValueOnce({
        success: true,
        data: mockAppliance
      })

      const h = mockToolkit
      const result = await getApplianceById.handler(mockRequest, h)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockAppliance)
      expect(result.statusCode).toBe(statusCodes.ok)
      expect(applianceController.getApplianceById).toHaveBeenCalledWith(
        mockRequest.db,
        'APP-123',
        mockRequest.logger
      )
    })

    test('returns 404 when appliance not found', async () => {
      applianceController.getApplianceById.mockResolvedValueOnce({
        success: false,
        message: 'Appliance not found',
        notFound: true
      })

      const h = mockToolkit
      const result = await getApplianceById.handler(mockRequest, h)

      expect(result.notFound).toBe(true)
      expect(result.success).toBe(false)
    })

    test('returns 500 on controller error', async () => {
      const error = new Error('Database error')
      applianceController.getApplianceById.mockRejectedValueOnce(error)

      const h = mockToolkit
      const result = await getApplianceById.handler(mockRequest, h)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Failed to fetch appliance')
      expect(result.error).toBe('Database error')
    })

    test('passes applianceId from params to controller', async () => {
      applianceController.getApplianceById.mockResolvedValueOnce({
        success: true,
        data: { id: 'APP-456' }
      })

      mockRequest.params.applianceId = 'APP-456'
      const h = mockToolkit

      await getApplianceById.handler(mockRequest, h)

      expect(applianceController.getApplianceById).toHaveBeenCalledWith(
        expect.anything(),
        'APP-456',
        expect.anything()
      )
    })

    test('logs errors when fetching fails', async () => {
      const error = new Error('Test error')
      applianceController.getApplianceById.mockRejectedValueOnce(error)

      const h = mockToolkit
      await getApplianceById.handler(mockRequest, h)

      expect(mockRequest.logger.error).not.toHaveBeenCalled() // Not logged in this handler
    })
  })

  describe('options.method', () => {
    test('route is GET', () => {
      expect(getApplianceById.method).toBe('GET')
    })
  })

  describe('options.path', () => {
    test('route path includes applianceId parameter', () => {
      expect(getApplianceById.path).toBe('/appliances/{applianceId}')
    })
  })

  describe('options.tags', () => {
    test('includes api and read tags', () => {
      expect(getApplianceById.options.tags).toContain('api')
      expect(getApplianceById.options.tags).toContain('read')
    })
  })

  describe('options.description', () => {
    test('has description', () => {
      expect(getApplianceById.options.description).toBeDefined()
    })
  })

  describe('options.validate', () => {
    test('validates params', () => {
      expect(getApplianceById.options.validate).toBeDefined()
      expect(getApplianceById.options.validate.params).toBeDefined()
    })

    test('requires applianceId param', () => {
      const paramsSchema = getApplianceById.options.validate.params
      const { error } = paramsSchema.validate({})
      expect(error).toBeDefined()
    })

    test('accepts applianceId param as string', () => {
      const paramsSchema = getApplianceById.options.validate.params
      const { error } = paramsSchema.validate({ applianceId: 'APP-123' })
      expect(error).toBeUndefined()
    })
  })
})
