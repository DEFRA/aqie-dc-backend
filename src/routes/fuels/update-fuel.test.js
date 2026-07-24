import { beforeEach, describe, test, expect, vi } from 'vitest'
import { updateFuel } from './update-fuel.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import * as fuelController from '../../controllers/fuels-controller.js'

// Mock the controller
vi.mock('../../controllers/fuels-controller.js', () => ({
  default: {},
  updateFuel: vi.fn()
}))

describe('PATCH /fuels/{fuelId}', () => {
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
      payload: {
        brandNames: 'Updated Brand'
      },
      db: {},
      logger: {
        info: vi.fn(),
        error: vi.fn()
      }
    }
  })

  describe('handler', () => {
    test('updates fuel successfully', async () => {
      const updatedFuel = {
        fuelId: 'FUEL-123',
        brandNames: 'Updated Brand',
        updatedAt: new Date()
      }

      fuelController.updateFuel.mockResolvedValueOnce({
        updated: updatedFuel
      })

      const h = mockToolkit
      const result = await updateFuel.handler(mockRequest, h)

      expect(result.updated).toEqual(updatedFuel)
      expect(result.statusCode).toBe(statusCodes.ok)
      expect(fuelController.updateFuel).toHaveBeenCalledWith(
        mockRequest.db,
        'FUEL-123',
        mockRequest.payload,
        mockRequest.logger
      )
    })

    test('returns 404 when fuel not found', async () => {
      fuelController.updateFuel.mockResolvedValueOnce({
        notFound: true
      })

      const h = mockToolkit
      const result = await updateFuel.handler(mockRequest, h)

      expect(result.notFound).toBe(true)
    })

    test('returns 500 on controller error', async () => {
      const error = new Error('Update failed')
      fuelController.updateFuel.mockRejectedValueOnce(error)

      const h = mockToolkit
      const result = await updateFuel.handler(mockRequest, h)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Failed to update fuel')
      expect(result.error).toBe('Update failed')
    })

    test('passes payload as updates to controller', async () => {
      const payload = {
        brandNames: 'New Brand',
        fuelWeight: 25
      }
      mockRequest.payload = payload

      fuelController.updateFuel.mockResolvedValueOnce({
        updated: { fuelId: 'FUEL-123', ...payload }
      })

      const h = mockToolkit
      await updateFuel.handler(mockRequest, h)

      expect(fuelController.updateFuel).toHaveBeenCalledWith(
        expect.anything(),
        'FUEL-123',
        payload,
        expect.anything()
      )
    })

    test('passes correct fuelId from params', async () => {
      mockRequest.params.fuelId = 'FUEL-456'

      fuelController.updateFuel.mockResolvedValueOnce({
        updated: { fuelId: 'FUEL-456' }
      })

      const h = mockToolkit
      await updateFuel.handler(mockRequest, h)

      expect(fuelController.updateFuel).toHaveBeenCalledWith(
        expect.anything(),
        'FUEL-456',
        expect.anything(),
        expect.anything()
      )
    })

    test('allows empty payload', async () => {
      mockRequest.payload = {}

      fuelController.updateFuel.mockResolvedValueOnce({
        updated: { fuelId: 'FUEL-123' }
      })

      const h = mockToolkit
      const result = await updateFuel.handler(mockRequest, h)

      expect(result.updated).toBeDefined()
    })
  })

  describe('options.method', () => {
    test('route is PATCH', () => {
      expect(updateFuel.method).toBe('PATCH')
    })
  })

  describe('options.path', () => {
    test('route path includes fuelId parameter', () => {
      expect(updateFuel.path).toBe('/fuels/{fuelId}')
    })
  })

  describe('options.tags', () => {
    test('includes api and fuels tags', () => {
      expect(updateFuel.options.tags).toContain('api')
      expect(updateFuel.options.tags).toContain('fuels')
    })
  })

  describe('options.description', () => {
    test('has description', () => {
      expect(updateFuel.options.description).toBeDefined()
    })
  })

  describe('options.validate', () => {
    test('validates params', () => {
      expect(updateFuel.options.validate).toBeDefined()
      expect(updateFuel.options.validate.params).toBeDefined()
    })

    test('requires fuelId param', () => {
      const paramsSchema = updateFuel.options.validate.params
      const { error } = paramsSchema.validate({})
      expect(error).toBeDefined()
    })

    test('accepts fuelId param as string', () => {
      const paramsSchema = updateFuel.options.validate.params
      const { error } = paramsSchema.validate({ fuelId: 'FUEL-123' })
      expect(error).toBeUndefined()
    })

    test('rejects unknown payload fields', () => {
      const payloadSchema = updateFuel.options.validate.payload
      const { error } = payloadSchema.validate({
        brandNames: 'Test',
        unknownField: 'value'
      })
      expect(error).toBeDefined()
    })

    test('requires at least one update field', () => {
      const payloadSchema = updateFuel.options.validate.payload
      const { error } = payloadSchema.validate({})
      expect(error).toBeDefined()
    })
  })
})
