import { describe, test, expect, beforeEach, vi } from 'vitest'

import { getAdminFuels } from '#src/routes/fuels/get-admin-fuels.js'
import * as fuelController from '#src/controllers/fuels-controller.js'

vi.mock('#src/controllers/fuels-controller.js', () => ({
  getAdminFuels: vi.fn()
}))

describe('getAdminFuels route', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    vi.clearAllMocks()

    mockRequest = {
      db: { collection: vi.fn() },
      logger: {
        info: vi.fn(),
        error: vi.fn()
      },
      query: {
        page: 1,
        limit: 20
      }
    }

    mockH = {
      response: vi.fn().mockReturnThis(),
      code: vi.fn().mockReturnThis()
    }
  })

  describe('route definition', () => {
    test('has expected method and path', () => {
      expect(getAdminFuels.method).toBe('GET')
      expect(getAdminFuels.path).toBe('/admin/fuels')
    })
  })

  describe('query validation', () => {
    const schema = getAdminFuels.options.validate.query

    test('applies default page and limit when omitted', () => {
      const { value, error } = schema.validate({})

      expect(error).toBeUndefined()
      expect(value).toEqual({
        page: 1,
        limit: 20
      })
    })

    test('accepts valid search query, statuses, page, and limit', () => {
      const { value, error } = schema.validate({
        q: "Oak-Briquette_1 & Co.'s",
        status: 'live,pending',
        page: 2,
        limit: 50
      })

      expect(error).toBeUndefined()
      expect(value).toEqual({
        q: "Oak-Briquette_1 & Co.'s",
        status: 'live,pending',
        page: 2,
        limit: 50
      })
    })

    test('allows empty string for q and status', () => {
      const { value, error } = schema.validate({
        q: '',
        status: ''
      })

      expect(error).toBeUndefined()
      expect(value.q).toBe('')
      expect(value.status).toBe('')
    })

    test('rejects q longer than 50 characters', () => {
      const { error } = schema.validate({
        q: 'a'.repeat(51)
      })

      expect(error).toBeDefined()
    })

    test('rejects disallowed characters in q', () => {
      const { error } = schema.validate({
        q: 'fuel$script<>'
      })

      expect(error).toBeDefined()
    })

    test('rejects page less than 1 or limit outside 1..100', () => {
      expect(schema.validate({ page: 0 }).error).toBeDefined()
      expect(schema.validate({ limit: 0 }).error).toBeDefined()
      expect(schema.validate({ limit: 101 }).error).toBeDefined()
    })
  })

  describe('handler', () => {
    test('calls fuelController.getAdminFuels with parsed query and statuses', async () => {
      const controllerResult = {
        success: true,
        data: [{ id: '2026-1', brandName: 'Oak Briquettes', status: 'live' }],
        pagination: { page: 2, limit: 10, total: 1, totalPages: 1 }
      }
      fuelController.getAdminFuels.mockResolvedValue(controllerResult)

      mockRequest.query = {
        q: 'Oak',
        page: 2,
        limit: 10,
        status: ' Live , PENDING , , '
      }

      await getAdminFuels.handler(mockRequest, mockH)

      expect(fuelController.getAdminFuels).toHaveBeenCalledWith(
        mockRequest.db,
        {
          query: 'Oak',
          page: 2,
          limit: 10,
          statuses: ['live', 'pending']
        },
        mockRequest.logger
      )
      expect(mockH.response).toHaveBeenCalledWith(controllerResult)
      expect(mockH.code).toHaveBeenCalledWith(200)
    })

    test('defaults query to empty string and statuses to empty array when status is omitted', async () => {
      const controllerResult = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      }
      fuelController.getAdminFuels.mockResolvedValue(controllerResult)

      await getAdminFuels.handler(mockRequest, mockH)

      expect(fuelController.getAdminFuels).toHaveBeenCalledWith(
        mockRequest.db,
        {
          query: '',
          page: 1,
          limit: 20,
          statuses: []
        },
        mockRequest.logger
      )
      expect(mockH.code).toHaveBeenCalledWith(200)
    })

    test('returns Boom 500 error when controller throws', async () => {
      fuelController.getAdminFuels.mockRejectedValue(
        new Error('Database failure')
      )

      const result = await getAdminFuels.handler(mockRequest, mockH)

      expect(result).toMatchObject({
        isBoom: true,
        output: {
          statusCode: 500
        }
      })
      expect(mockRequest.logger.error).toHaveBeenCalled()
    })
  })
})
