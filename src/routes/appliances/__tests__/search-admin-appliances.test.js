import { beforeEach, describe, test, expect, vi } from 'vitest'
import { searchAdminAppliances } from '#src/routes/appliances/search-admin-appliances.js'
import { statusCodes } from '#src/common/constants/status-codes.js'
import * as applianceController from '#src/controllers/appliances-controller.js'

// Mock the controller
vi.mock('#src/controllers/appliances-controller.js', () => ({
  default: {},
  searchAdminAppliances: vi.fn()
}))

describe('GET /api/admin/appliances/search', () => {
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

      applianceController.searchAdminAppliances.mockResolvedValueOnce({
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
      const result = await searchAdminAppliances.handler(mockRequest, h)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(results)
      expect(result.statusCode).toBe(statusCodes.ok)
      expect(applianceController.searchAdminAppliances).toHaveBeenCalledWith(
        mockRequest.db,
        { query: 'boiler', page: 1, limit: 20, statuses: [] },
        mockRequest.logger
      )
    })

    test('returns pagination metadata', async () => {
      applianceController.searchAdminAppliances.mockResolvedValueOnce({
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
      const result = await searchAdminAppliances.handler(mockRequest, h)

      expect(result.pagination).toBeDefined()
      expect(result.pagination.page).toBe(2)
      expect(result.pagination.limit).toBe(10)
      expect(result.pagination.total).toBe(25)
      expect(result.pagination.totalPages).toBe(3)
    })

    test('returns empty array when no results found', async () => {
      applianceController.searchAdminAppliances.mockResolvedValueOnce({
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
      const result = await searchAdminAppliances.handler(mockRequest, h)

      expect(result.data).toEqual([])
      expect(result.pagination.total).toBe(0)
    })

    test('passes query param as search query', async () => {
      mockRequest.query.q = 'furnace model x'

      applianceController.searchAdminAppliances.mockResolvedValueOnce({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      })

      const h = mockToolkit
      await searchAdminAppliances.handler(mockRequest, h)

      expect(applianceController.searchAdminAppliances).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ query: 'furnace model x' }),
        expect.anything()
      )
    })

    test('passes status filter params to controller', async () => {
      mockRequest.query.status = 'pending,live'

      applianceController.searchAdminAppliances.mockResolvedValueOnce({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      })

      const h = mockToolkit
      await searchAdminAppliances.handler(mockRequest, h)

      expect(applianceController.searchAdminAppliances).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ statuses: ['pending', 'live'] }),
        expect.anything()
      )
    })

    test('passes pagination params to controller', async () => {
      mockRequest.query.page = 3
      mockRequest.query.limit = 15

      applianceController.searchAdminAppliances.mockResolvedValueOnce({
        success: true,
        data: [],
        pagination: { page: 3, limit: 15, total: 0, totalPages: 0 }
      })

      const h = mockToolkit
      await searchAdminAppliances.handler(mockRequest, h)

      expect(applianceController.searchAdminAppliances).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ page: 3, limit: 15 }),
        expect.anything()
      )
    })

    test('returns 500 on controller error', async () => {
      const error = new Error('Search failed')
      applianceController.searchAdminAppliances.mockRejectedValueOnce(error)

      const h = mockToolkit
      const result = await searchAdminAppliances.handler(mockRequest, h)

      expect(result.isBoom).toBe(true)
      expect(result.output.statusCode).toBe(statusCodes.internalServerError)
      expect(result.message).toBe('Failed to search appliances')
      expect(result.output.payload.message).toBe(
        'An internal server error occurred'
      )
      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        error,
        'Failed to search admin appliances'
      )
    })

    test('uses request.logger', async () => {
      applianceController.searchAdminAppliances.mockResolvedValueOnce({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      })

      const h = mockToolkit
      await searchAdminAppliances.handler(mockRequest, h)

      expect(applianceController.searchAdminAppliances).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        mockRequest.logger
      )
    })
  })

  describe('options.method', () => {
    test('route is GET', () => {
      expect(searchAdminAppliances.method).toBe('GET')
    })
  })

  describe('options.path', () => {
    test('route path is /api/admin/appliances/search', () => {
      expect(searchAdminAppliances.path).toBe('/api/admin/appliances/search')
    })
  })

  describe('options.validate', () => {
    test('validates query params', () => {
      expect(searchAdminAppliances.options.validate).toBeDefined()
      expect(searchAdminAppliances.options.validate.query).toBeDefined()
    })

    test('allows empty q query values for a full-list search', () => {
      const querySchema = searchAdminAppliances.options.validate.query
      const { error } = querySchema.validate({})
      expect(error).toBeUndefined()
    })

    test('accepts a short query value when it is otherwise valid', () => {
      const querySchema = searchAdminAppliances.options.validate.query
      const { error } = querySchema.validate({ q: 'a' })
      expect(error).toBeUndefined()
    })

    test('has default page value', () => {
      const querySchema = searchAdminAppliances.options.validate.query
      const { value, error } = querySchema.validate({ q: 'test' })
      expect(error).toBeUndefined()
      expect(value.page).toBe(1)
    })

    test('has default limit value', () => {
      const querySchema = searchAdminAppliances.options.validate.query
      const { value, error } = querySchema.validate({ q: 'test' })
      expect(error).toBeUndefined()
      expect(value.limit).toBe(20)
    })

    test('validates page is at least 1', () => {
      const querySchema = searchAdminAppliances.options.validate.query
      const { error } = querySchema.validate({ q: 'test', page: 0 })
      expect(error).toBeDefined()
    })

    test('validates limit is at least 1', () => {
      const querySchema = searchAdminAppliances.options.validate.query
      const { error } = querySchema.validate({ q: 'test', limit: 0 })
      expect(error).toBeDefined()
    })

    test('validates limit max is 100', () => {
      const querySchema = searchAdminAppliances.options.validate.query
      const { error } = querySchema.validate({ q: 'test', limit: 101 })
      expect(error).toBeDefined()
    })

    test('accepts valid page and limit', () => {
      const querySchema = searchAdminAppliances.options.validate.query
      const { error } = querySchema.validate({ q: 'test', page: 2, limit: 50 })
      expect(error).toBeUndefined()
    })
  })
})
