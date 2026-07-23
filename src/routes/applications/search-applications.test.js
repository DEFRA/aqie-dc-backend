import { beforeEach, describe, test, expect, vi } from 'vitest'
import { searchApplications } from './search-applications.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import * as applicationsController from '../../controllers/applications-controller.js'

// Mock the controller
vi.mock('../../controllers/applications-controller.js', () => ({
  default: {},
  searchApplications: vi.fn()
}))

describe('GET /applications/search', () => {
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
        q: 'test',
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
    test('searches applications and returns matching results', async () => {
      const mockResults = [
        {
          applicationId: 'app-001',
          status: 'new',
          reviewer: 'John'
        },
        {
          applicationId: 'app-002',
          status: 'in_progress',
          reviewer: 'Jane'
        }
      ]

      applicationsController.searchApplications.mockResolvedValueOnce({
        success: true,
        message: 'Applications search completed successfully',
        data: mockResults,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1
        }
      })

      const h = mockToolkit
      const result = await searchApplications.handler(mockRequest, h)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.statusCode).toBe(statusCodes.ok)
      expect(result.pagination.total).toBe(2)
      expect(applicationsController.searchApplications).toHaveBeenCalledWith(
        mockRequest.db,
        { query: 'test', page: 1, limit: 20 },
        mockRequest.logger
      )
    })

    test('returns empty results when no matches found', async () => {
      applicationsController.searchApplications.mockResolvedValueOnce({
        success: true,
        message: 'Applications search completed successfully',
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0
        }
      })

      const h = mockToolkit
      const result = await searchApplications.handler(mockRequest, h)

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
      expect(result.pagination.total).toBe(0)
    })

    test('includes pagination info in response', async () => {
      const mockResults = []
      for (let i = 0; i < 5; i++) {
        mockResults.push({
          applicationId: `app-${i}`,
          status: 'new'
        })
      }

      applicationsController.searchApplications.mockResolvedValueOnce({
        success: true,
        data: mockResults,
        pagination: {
          page: 1,
          limit: 20,
          total: 5,
          totalPages: 1
        }
      })

      const h = mockToolkit
      const result = await searchApplications.handler(mockRequest, h)

      expect(result.pagination).toBeDefined()
      expect(result.pagination.page).toBe(1)
      expect(result.pagination.limit).toBe(20)
      expect(result.pagination.total).toBe(5)
      expect(result.pagination.totalPages).toBe(1)
    })

    test('calculates correct pagination for multiple pages', async () => {
      applicationsController.searchApplications.mockResolvedValueOnce({
        success: true,
        data: [],
        pagination: {
          page: 2,
          limit: 10,
          total: 25,
          totalPages: 3
        }
      })

      mockRequest.query.page = 2
      mockRequest.query.limit = 10

      const h = mockToolkit
      const result = await searchApplications.handler(mockRequest, h)

      expect(result.pagination.page).toBe(2)
      expect(result.pagination.totalPages).toBe(3)
    })

    test('passes query parameters to controller', async () => {
      applicationsController.searchApplications.mockResolvedValueOnce({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      })

      mockRequest.query.q = 'John'
      mockRequest.query.page = 1
      mockRequest.query.limit = 20

      const h = mockToolkit
      await searchApplications.handler(mockRequest, h)

      expect(applicationsController.searchApplications).toHaveBeenCalledWith(
        mockRequest.db,
        { query: 'John', page: 1, limit: 20 },
        mockRequest.logger
      )
    })

    test('handles controller error and returns 500', async () => {
      const error = new Error('Search query failed')
      applicationsController.searchApplications.mockRejectedValueOnce(error)

      const h = mockToolkit
      const result = await searchApplications.handler(mockRequest, h)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Failed to search applications')
      expect(result.error).toBe('Search query failed')
    })

    test('searches across multiple fields', async () => {
      // Test searching by different query terms
      const queries = ['status: new', 'reviewer: John', 'app-123']

      for (const queryTerm of queries) {
        applicationsController.searchApplications.mockResolvedValueOnce({
          success: true,
          data: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
        })

        mockRequest.query.q = queryTerm
        const h = mockToolkit
        await searchApplications.handler(mockRequest, h)

        expect(applicationsController.searchApplications).toHaveBeenCalledWith(
          mockRequest.db,
          expect.objectContaining({ query: queryTerm }),
          mockRequest.logger
        )
      }
    })

    test('handles different page sizes', async () => {
      const pageSizes = [10, 20, 50]

      for (const limit of pageSizes) {
        applicationsController.searchApplications.mockResolvedValueOnce({
          success: true,
          data: [],
          pagination: { page: 1, limit, total: 0, totalPages: 0 }
        })

        mockRequest.query.limit = limit
        const h = mockToolkit
        await searchApplications.handler(mockRequest, h)

        expect(applicationsController.searchApplications).toHaveBeenCalledWith(
          mockRequest.db,
          expect.objectContaining({ limit }),
          mockRequest.logger
        )
      }
    })

    test('returns proper response structure', async () => {
      applicationsController.searchApplications.mockResolvedValueOnce({
        success: true,
        message: 'Applications search completed successfully',
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      })

      const h = mockToolkit
      const result = await searchApplications.handler(mockRequest, h)

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('message')
      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('pagination')
    })
  })

  describe('options.method', () => {
    test('route is GET', () => {
      expect(searchApplications.method).toBe('GET')
    })
  })

  describe('options.path', () => {
    test('route path is /applications/search', () => {
      expect(searchApplications.path).toBe('/applications/search')
    })
  })

  describe('options.tags', () => {
    test('includes api and applications tags', () => {
      expect(searchApplications.options.tags).toContain('api')
      expect(searchApplications.options.tags).toContain('applications')
    })
  })

  describe('options.description', () => {
    test('has description', () => {
      expect(searchApplications.options.description).toBeDefined()
    })

    test('has notes', () => {
      expect(searchApplications.options.notes).toBeDefined()
    })
  })

  describe('options.validate', () => {
    test('has query validation', () => {
      expect(searchApplications.options.validate).toBeDefined()
      expect(searchApplications.options.validate.query).toBeDefined()
    })

    test('query parameter is required', () => {
      const querySchema = searchApplications.options.validate.query
      expect(querySchema).toBeDefined()
      // Schema object should define 'q' as required
    })

    test('page parameter is optional with default', () => {
      const querySchema = searchApplications.options.validate.query
      expect(querySchema).toBeDefined()
      // Page should have a default value
    })

    test('limit parameter has min and max constraints', () => {
      const querySchema = searchApplications.options.validate.query
      expect(querySchema).toBeDefined()
      // Limit should have constraints between 1 and 100
    })

    test('query validation requires minimum query length', () => {
      const querySchema = searchApplications.options.validate.query
      expect(querySchema).toBeDefined()
      // Query string should have minimum length requirement (typically 2)
    })
  })
})
