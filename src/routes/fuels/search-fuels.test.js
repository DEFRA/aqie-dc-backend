import { beforeEach, describe, test, expect, vi } from 'vitest'
import { searchFuels } from './search-fuels.js'
import { statusCodes } from '../../common/constants/status-codes.js'

// Mock the controller
vi.mock('../../controllers/fuels-controller.js', () => ({
  default: {},
  searchFuels: vi.fn()
}))

import * as fuelsController from '../../controllers/fuels-controller.js'

describe('GET /api/fuels/search', () => {
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
        q: 'pellets',
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
    test('searches fuels by query string', async () => {
      const results = [
        {
          name: 'Premium Pellets',
          id: 'FUEL-001',
          manufacturer: 'FuelCorp'
        }
      ]

      fuelsController.searchFuels.mockResolvedValueOnce({
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
      const result = await searchFuels.handler(mockRequest, h)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(results)
      expect(fuelsController.searchFuels).toHaveBeenCalledWith(
        mockRequest.db,
        { query: 'pellets', page: 1, limit: 20 },
        mockRequest.logger
      )
    })

    test('returns pagination metadata', async () => {
      fuelsController.searchFuels.mockResolvedValueOnce({
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
      const result = await searchFuels.handler(mockRequest, h)

      expect(result.pagination).toBeDefined()
      expect(result.pagination.page).toBe(2)
      expect(result.pagination.limit).toBe(10)
      expect(result.pagination.total).toBe(25)
      expect(result.pagination.totalPages).toBe(3)
    })

    test('returns empty array when no results found', async () => {
      fuelsController.searchFuels.mockResolvedValueOnce({
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
      const result = await searchFuels.handler(mockRequest, h)

      expect(result.data).toEqual([])
      expect(result.pagination.total).toBe(0)
    })

    test('passes query param as search query', async () => {
      mockRequest.query.q = 'premium logs'

      fuelsController.searchFuels.mockResolvedValueOnce({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      })

      const h = mockToolkit
      await searchFuels.handler(mockRequest, h)

      expect(fuelsController.searchFuels).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ query: 'premium logs' }),
        expect.anything()
      )
    })

    test('passes pagination params to controller', async () => {
      mockRequest.query.page = 3
      mockRequest.query.limit = 15

      fuelsController.searchFuels.mockResolvedValueOnce({
        success: true,
        data: [],
        pagination: { page: 3, limit: 15, total: 0, totalPages: 0 }
      })

      const h = mockToolkit
      await searchFuels.handler(mockRequest, h)

      expect(fuelsController.searchFuels).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ page: 3, limit: 15 }),
        expect.anything()
      )
    })

    test('returns 500 on controller error', async () => {
      const error = new Error('Search failed')
      fuelsController.searchFuels.mockRejectedValueOnce(error)

      const h = mockToolkit
      const result = await searchFuels.handler(mockRequest, h)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Failed to search fuels')
      expect(result.error).toBe('Search failed')
    })

    test('uses request.logger', async () => {
      fuelsController.searchFuels.mockResolvedValueOnce({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      })

      const h = mockToolkit
      await searchFuels.handler(mockRequest, h)

      expect(fuelsController.searchFuels).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        mockRequest.logger
      )
    })
  })

  describe('options.method', () => {
    test('route is GET', () => {
      expect(searchFuels.method).toBe('GET')
    })
  })

  describe('options.path', () => {
    test('route path is /api/fuels/search', () => {
      expect(searchFuels.path).toBe('/api/fuels/search')
    })
  })

  describe('options.validate', () => {
    test('validates query params', () => {
      expect(searchFuels.options.validate).toBeDefined()
      expect(searchFuels.options.validate.query).toBeDefined()
    })

    test('requires q query param', () => {
      const querySchema = searchFuels.options.validate.query
      const { error } = querySchema.validate({})
      expect(error).toBeDefined()
    })

    test('requires q to be at least 2 characters', () => {
      const querySchema = searchFuels.options.validate.query
      const { error } = querySchema.validate({ q: 'a' })
      expect(error).toBeDefined()
    })

    test('accepts valid query with minimum length', () => {
      const querySchema = searchFuels.options.validate.query
      const { error } = querySchema.validate({ q: 'ab' })
      expect(error).toBeUndefined()
    })

    test('has default page value', () => {
      const querySchema = searchFuels.options.validate.query
      const { value, error } = querySchema.validate({ q: 'test' })
      expect(error).toBeUndefined()
      expect(value.page).toBe(1)
    })

    test('has default limit value', () => {
      const querySchema = searchFuels.options.validate.query
      const { value, error } = querySchema.validate({ q: 'test' })
      expect(error).toBeUndefined()
      expect(value.limit).toBe(20)
    })

    test('validates page is at least 1', () => {
      const querySchema = searchFuels.options.validate.query
      const { error } = querySchema.validate({ q: 'test', page: 0 })
      expect(error).toBeDefined()
    })

    test('validates limit is at least 1', () => {
      const querySchema = searchFuels.options.validate.query
      const { error } = querySchema.validate({ q: 'test', limit: 0 })
      expect(error).toBeDefined()
    })

    test('validates limit max is 100', () => {
      const querySchema = searchFuels.options.validate.query
      const { error } = querySchema.validate({ q: 'test', limit: 101 })
      expect(error).toBeDefined()
    })

    test('accepts valid page and limit', () => {
      const querySchema = searchFuels.options.validate.query
      const { error } = querySchema.validate({ q: 'test', page: 2, limit: 50 })
      expect(error).toBeUndefined()
    })
  })
})
