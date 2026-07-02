import { beforeEach, describe, test, expect, vi } from 'vitest'
import { deleteFuel } from './delete-fuel.js'
import { statusCodes } from '../../common/constants/status-codes.js'

// Mock the controller
vi.mock('../../controllers/fuels-controller.js', () => ({
  default: {},
  deleteFuel: vi.fn()
}))

import * as fuelController from '../../controllers/fuels-controller.js'

describe('DELETE /fuels/{fuelId}', () => {
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
    test('deletes fuel successfully', async () => {
      fuelController.deleteFuel.mockResolvedValueOnce({
        deleted: true
      })

      const h = mockToolkit
      const result = await deleteFuel.handler(mockRequest, h)

      expect(result.deleted).toBe(true)
      expect(fuelController.deleteFuel).toHaveBeenCalledWith(
        mockRequest.db,
        'FUEL-123',
        mockRequest.logger
      )
    })

    test('returns 404 when fuel not found', async () => {
      fuelController.deleteFuel.mockResolvedValueOnce({
        notFound: true
      })

      const h = mockToolkit
      const result = await deleteFuel.handler(mockRequest, h)

      expect(result.notFound).toBe(true)
    })

    test('returns 500 on controller error', async () => {
      const error = new Error('Delete failed')
      fuelController.deleteFuel.mockRejectedValueOnce(error)

      const h = mockToolkit
      const result = await deleteFuel.handler(mockRequest, h)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Failed to delete fuel')
      expect(result.error).toBe('Delete failed')
    })

    test('passes correct fuelId from params to controller', async () => {
      fuelController.deleteFuel.mockResolvedValueOnce({
        deleted: true
      })

      mockRequest.params.fuelId = 'FUEL-456'
      const h = mockToolkit

      await deleteFuel.handler(mockRequest, h)

      expect(fuelController.deleteFuel).toHaveBeenCalledWith(
        expect.anything(),
        'FUEL-456',
        expect.anything()
      )
    })
  })

  describe('options.method', () => {
    test('route is DELETE', () => {
      expect(deleteFuel.method).toBe('DELETE')
    })
  })

  describe('options.path', () => {
    test('route path includes fuelId parameter', () => {
      expect(deleteFuel.path).toBe('/fuels/{fuelId}')
    })
  })

  describe('options.tags', () => {
    test('includes api and fuels tags', () => {
      expect(deleteFuel.options.tags).toContain('api')
      expect(deleteFuel.options.tags).toContain('fuels')
    })
  })

  describe('options.description', () => {
    test('has description for delete operation', () => {
      expect(deleteFuel.options.description).toBeDefined()
      expect(deleteFuel.options.description.toLowerCase()).toContain('delete')
    })
  })

  describe('options.validate', () => {
    test('validates params', () => {
      expect(deleteFuel.options.validate).toBeDefined()
      expect(deleteFuel.options.validate.params).toBeDefined()
    })

    test('requires fuelId param', () => {
      const paramsSchema = deleteFuel.options.validate.params
      const { error } = paramsSchema.validate({})
      expect(error).toBeDefined()
    })

    test('accepts fuelId param as string', () => {
      const paramsSchema = deleteFuel.options.validate.params
      const { error } = paramsSchema.validate({ fuelId: 'FUEL-123' })
      expect(error).toBeUndefined()
    })
  })
})
