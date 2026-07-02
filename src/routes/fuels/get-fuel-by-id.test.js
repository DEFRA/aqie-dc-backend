import { beforeEach, describe, test, expect, vi } from 'vitest'
import { getFuelById } from './get-fuel-by-id.js'
import { statusCodes } from '../../common/constants/status-codes.js'

// Mock the controller
vi.mock('../../controllers/fuels-controller.js', () => ({
  default: {},
  getFuelById: vi.fn()
}))

import * as fuelController from '../../controllers/fuels-controller.js'

describe('GET /fuels/{fuelId}', () => {
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
        fuelId: 'FUEL-123'
      },
      db: {},
      logger: {
        info: vi.fn(),
        error: vi.fn()
      }
    }
  })

  describe('handler', () => {
    test('returns fuel detail when found', async () => {
      const mockFuel = {
        id: 'FUEL-123',
        name: 'Premium Pellets',
        manufacturer: 'FuelCorp',
        authorisedIn: ['England', 'Scotland'],
        fullAddress: ['789 Industrial Est', 'Manchester']
      }

      fuelController.getFuelById.mockResolvedValueOnce({
        success: true,
        data: mockFuel
      })

      const h = mockToolkit
      const result = await getFuelById.handler(mockRequest, h)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockFuel)
      expect(fuelController.getFuelById).toHaveBeenCalledWith(
        mockRequest.db,
        'FUEL-123',
        mockRequest.logger
      )
    })

    test('returns 404 when fuel not found', async () => {
      fuelController.getFuelById.mockResolvedValueOnce({
        success: false,
        message: 'Fuel not found',
        notFound: true
      })

      const h = mockToolkit
      const result = await getFuelById.handler(mockRequest, h)

      expect(result.notFound).toBe(true)
      expect(result.success).toBe(false)
    })

    test('returns 500 on controller error', async () => {
      const error = new Error('Database error')
      fuelController.getFuelById.mockRejectedValueOnce(error)

      const h = mockToolkit
      const result = await getFuelById.handler(mockRequest, h)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Failed to fetch fuel')
      expect(result.error).toBe('Database error')
    })

    test('passes fuelId from params to controller', async () => {
      fuelController.getFuelById.mockResolvedValueOnce({
        success: true,
        data: { id: 'FUEL-456' }
      })

      mockRequest.params.fuelId = 'FUEL-456'
      const h = mockToolkit

      await getFuelById.handler(mockRequest, h)

      expect(fuelController.getFuelById).toHaveBeenCalledWith(
        expect.anything(),
        'FUEL-456',
        expect.anything()
      )
    })
  })

  describe('options.method', () => {
    test('route is GET', () => {
      expect(getFuelById.method).toBe('GET')
    })
  })

  describe('options.path', () => {
    test('route path includes fuelId parameter', () => {
      expect(getFuelById.path).toBe('/fuels/{fuelId}')
    })
  })

  describe('options.tags', () => {
    test('includes api and read tags', () => {
      expect(getFuelById.options.tags).toContain('api')
      expect(getFuelById.options.tags).toContain('read')
    })
  })

  describe('options.description', () => {
    test('has description', () => {
      expect(getFuelById.options.description).toBeDefined()
    })
  })

  describe('options.validate', () => {
    test('validates params', () => {
      expect(getFuelById.options.validate).toBeDefined()
      expect(getFuelById.options.validate.params).toBeDefined()
    })

    test('requires fuelId param', () => {
      const paramsSchema = getFuelById.options.validate.params
      const { error } = paramsSchema.validate({})
      expect(error).toBeDefined()
    })

    test('accepts fuelId param as string', () => {
      const paramsSchema = getFuelById.options.validate.params
      const { error } = paramsSchema.validate({ fuelId: 'FUEL-123' })
      expect(error).toBeUndefined()
    })
  })
})
