import { beforeEach, describe, test, expect, vi } from 'vitest'
import { getAllFuels } from './get-all-fuels.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import * as fuelController from '../../controllers/fuels-controller.js'

// Mock the controller
vi.mock('../../controllers/fuels-controller.js', () => ({
  default: {},
  getAllFuels: vi.fn()
}))

describe('GET /fuels', () => {
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
    test('returns all fuels successfully', async () => {
      const mockFuels = [
        {
          name: 'Premium Pellets',
          id: 'FUEL-001',
          manufacturer: 'FuelCorp'
        },
        {
          name: 'Standard Logs',
          id: 'FUEL-002',
          manufacturer: 'LogCorp'
        }
      ]

      fuelController.getAllFuels.mockResolvedValueOnce({
        success: true,
        data: mockFuels
      })

      const h = mockToolkit
      const result = await getAllFuels.handler(mockRequest, h)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockFuels)
      expect(result.statusCode).toBe(statusCodes.ok)
      expect(fuelController.getAllFuels).toHaveBeenCalledWith(
        mockRequest.db,
        mockRequest.logger
      )
    })

    test('returns empty array when no fuels exist', async () => {
      fuelController.getAllFuels.mockResolvedValueOnce({
        success: true,
        data: []
      })

      const h = mockToolkit
      const result = await getAllFuels.handler(mockRequest, h)

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
    })

    test('handles controller error and returns 500', async () => {
      const error = new Error('Database connection failed')
      fuelController.getAllFuels.mockRejectedValueOnce(error)

      const h = mockToolkit
      const result = await getAllFuels.handler(mockRequest, h)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Failed to fetch fuels')
      expect(result.error).toBe('Database connection failed')
    })
  })

  describe('options.method', () => {
    test('route is GET', () => {
      expect(getAllFuels.method).toBe('GET')
    })
  })

  describe('options.path', () => {
    test('route path is /fuels', () => {
      expect(getAllFuels.path).toBe('/fuels')
    })
  })

  describe('options.tags', () => {
    test('includes api and fuels tags', () => {
      expect(getAllFuels.options.tags).toContain('api')
      expect(getAllFuels.options.tags).toContain('fuels')
    })
  })

  describe('options.description', () => {
    test('has description', () => {
      expect(getAllFuels.options.description).toBeDefined()
    })
  })

  describe('options.notes', () => {
    test('has notes about certified fuels', () => {
      expect(getAllFuels.options.notes).toBeDefined()
    })
  })
})
