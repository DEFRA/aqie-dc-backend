import { beforeEach, describe, test, expect, vi } from 'vitest'
import { searchAppliances } from './search-appliances.js'
import { statusCodes } from '../../common/constants/status-codes.js'

// Mock the controller
vi.mock('../../controllers/appliances-controller.js', () => ({
  default: {},
  searchAppliances: vi.fn()
}))

import * as applianceController from '../../controllers/appliances-controller.js'

describe('GET /api/appliances/search', () => {
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
      query: {
        q: 'boiler',
        page: 1,
        limit: 20
      },
      db: {},
      logger: {
        info: vi.fn(),
        error: vi.fn()
      }
    }
  })

  describe('handler', () => {
    test('searches appliances by query string', async () => {
      const results = [
        {
          name: 'Eco Boiler 2000',
          id: 'APP-001',
          manufacturer: 'TechHeat'
        }
      ]

      applianceController.searchAppliances.mockResolvedValueOnce({
        success: true,
        data: results,
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1
        }
      })

      const h = mockToolkit
      const result = await searchAppliances.handler(mockRequest, h)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(results)
      expect(applianceController.searchAppliances).toHaveBeenCalledWith(
        mockRequest.db,
        { query: 'boiler', page: 1, limit: 20 },
        mockRequest.logger
      )
    })

    test('returns pagination metadata', async () => {
      applianceController.searchAppliances.mockResolvedValueOnce({
        success: true,
        data: [],
        pagination: {
          page: 2,
          limit: 10,
          total: 25,
          totalPages: 3
        }
      })

      const h = mockToolkit
      const result = await searchAppliances.handler(mockRequest, h)

      expect(result.pagination).toBeDefined()
      expect(result.pagination.page).toBe(2)
      expect(result.pagination.limit).toBe(10)
      expect(result.pagination.total).toBe(25)
      expect(result.pagination.totalPages).toBe(3)
    })

    test('returns empty array when no results found', async () => {
      applianceController.searchAppliances.mockResolvedValueOnce({
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0
        }
      })

      const h = mockToolkit
      const result = await searchAppliances.handler(mockRequest, h)

      expect(result.data).toEqual([])
      expect(result.pagination.total).toBe(0)
    })

    test('passes query param as search query', async () => {
      mockRequest.query.q = 'furnace model x'

      applianceController.searchAppliances.mockResolvedValueOnce({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      })

      const h = mockToolkit
      await searchAppliances.handler(mockRequest, h)

      expect(applianceController.searchAppliances).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ query: 'furnace model x' }),
        expect.anything()
      )
    })

    test('passes pagination params to controller', async () => {
      mockRequest.query.page = 3
      mockRequest.query.limit = 15

      applianceController.searchAppliances.mockResolvedValueOnce({
        success: true,
        data: [],
        pagination: { page: 3, limit: 15, total: 0, totalPages: 0 }
      })

      const h = mockToolkit
      await searchAppliances.handler(mockRequest, h)

      expect(applianceController.searchAppliances).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ page: 3, limit: 15 }),
        expect.anything()
      )
    })

    test('returns 500 on controller error', async () => {
      const error = new Error('Search failed')
      applianceController.searchAppliances.mockRejectedValueOnce(error)

      const h = mockToolkit
      const result = await searchAppliances.handler(mockRequest, h)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Failed to search appliances')
      expect(result.error).toBe('Search failed')
    })

    test('uses request.logger', async () => {
      applianceController.searchAppliances.mockResolvedValueOnce({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      })

      const h = mockToolkit
      await searchAppliances.handler(mockRequest, h)

      expect(applianceController.searchAppliances).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        mockRequest.logger
      )
    })
  })

  describe('options.method', () => {
    test('route is GET', () => {
      expect(searchAppliances.method).toBe('GET')
    })
  })

  describe('options.path', () => {
    test('route path is /api/appliances/search', () => {
      expect(searchAppliances.path).toBe('/api/appliances/search')
    })
  })

  describe('options.validate', () => {
    test('validates query params', () => {
      expect(searchAppliances.options.validate).toBeDefined()
      expect(searchAppliances.options.validate.query).toBeDefined()
    })

    test('requires q query param', () => {
      const querySchema = searchAppliances.options.validate.query
      const { error } = querySchema.validate({})
      expect(error).toBeDefined()
    })

    test('requires q to be at least 2 characters', () => {
      const querySchema = searchAppliances.options.validate.query
      const { error } = querySchema.validate({ q: 'a' })
      expect(error).toBeDefined()
    })

    test('accepts valid query with minimum length', () => {
      const querySchema = searchAppliances.options.validate.query
      const { error } = querySchema.validate({ q: 'ab' })
      expect(error).toBeUndefined()
    })

    test('has default page value', () => {
      const querySchema = searchAppliances.options.validate.query
      const { value, error } = querySchema.validate({ q: 'test' })
      expect(error).toBeUndefined()
      expect(value.page).toBe(1)
    })

    test('has default limit value', () => {
      const querySchema = searchAppliances.options.validate.query
      const { value, error } = querySchema.validate({ q: 'test' })
      expect(error).toBeUndefined()
      expect(value.limit).toBe(20)
    })

    test('validates page is at least 1', () => {
      const querySchema = searchAppliances.options.validate.query
      const { error } = querySchema.validate({ q: 'test', page: 0 })
      expect(error).toBeDefined()
    })

    test('validates limit is at least 1', () => {
      const querySchema = searchAppliances.options.validate.query
      const { error } = querySchema.validate({ q: 'test', limit: 0 })
      expect(error).toBeDefined()
    })

    test('validates limit max is 100', () => {
      const querySchema = searchAppliances.options.validate.query
      const { error } = querySchema.validate({ q: 'test', limit: 101 })
      expect(error).toBeDefined()
    })

    test('accepts valid page and limit', () => {
      const querySchema = searchAppliances.options.validate.query
      const { error } = querySchema.validate({ q: 'test', page: 2, limit: 50 })
      expect(error).toBeUndefined()
    })
  })
})
