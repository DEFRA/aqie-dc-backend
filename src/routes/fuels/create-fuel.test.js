import { beforeEach, describe, test, expect, vi } from 'vitest'
import { createFuel } from './create-fuel.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import fuelExample from '../../sample-data/fuel-example.js'

// Mock the controller
vi.mock('../../controllers/fuels-controller.js', () => ({
  default: {},
  createFuel: vi.fn()
}))

import * as fuelController from '../../controllers/fuels-controller.js'

describe('POST /fuels', () => {
  let mockRequest
  let mockToolkit

  beforeEach(() => {
    vi.clearAllMocks()

    mockToolkit = {
      response: vi.fn(function (data) {
        return {
          data,
          code: vi.fn(function (code) {
            return { ...data, statusCode: code }
          }),
          takeover: vi.fn(function () {
            return this
          })
        }
      })
    }

    mockRequest = {
      pre: {
        validatedPayload: fuelExample
      },
      db: {},
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn()
      }
    }
  })

  describe('handler', () => {
    test('creates fuel successfully and returns 201', async () => {
      const mockId = 'FUEL-123456'
      fuelController.createFuel.mockResolvedValueOnce({
        success: true,
        message: 'Fuel created successfully',
        data: {
          fuelId: mockId,
          ...fuelExample
        }
      })

      const h = mockToolkit
      const result = await createFuel.handler(mockRequest, h)

      expect(result.success).toBe(true)
      expect(result.message).toBe('Fuel created successfully')
      expect(result.data.fuelId).toBe(mockId)
      expect(fuelController.createFuel).toHaveBeenCalledWith(
        mockRequest.db,
        fuelExample,
        mockRequest.logger
      )
    })

    test('returns 500 when controller throws error', async () => {
      const error = new Error('Database error')
      fuelController.createFuel.mockRejectedValueOnce(error)

      const h = mockToolkit
      const result = await createFuel.handler(mockRequest, h)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Failed to create fuel')
      expect(result.error).toBe('Database error')
      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        error,
        'Failed to create fuel'
      )
    })

    test('returns request.pre.validatedPayload as newItem', async () => {
      const customPayload = {
        ...fuelExample,
        brandNames: 'Custom Brand'
      }
      mockRequest.pre.validatedPayload = customPayload

      fuelController.createFuel.mockResolvedValueOnce({
        success: true,
        message: 'Fuel created successfully',
        data: { fuelId: 'FUEL-123' }
      })

      const h = mockToolkit
      await createFuel.handler(mockRequest, h)

      expect(fuelController.createFuel).toHaveBeenCalledWith(
        mockRequest.db,
        customPayload,
        mockRequest.logger
      )
    })

    test('includes fuelId in response data', async () => {
      const fuelId = 'FUEL-xyz789'
      fuelController.createFuel.mockResolvedValueOnce({
        success: true,
        message: 'Fuel created successfully',
        data: {
          fuelId,
          ...fuelExample
        }
      })

      const h = mockToolkit
      const result = await createFuel.handler(mockRequest, h)

      expect(result.data).toEqual({ fuelId })
    })
  })

  describe('options.method', () => {
    test('route is POST', () => {
      expect(createFuel.method).toBe('POST')
    })
  })

  describe('options.path', () => {
    test('route path is /fuels', () => {
      expect(createFuel.path).toBe('/fuels')
    })
  })

  describe('options.tags', () => {
    test('includes api and fuels tags', () => {
      expect(createFuel.options.tags).toContain('api')
      expect(createFuel.options.tags).toContain('fuels')
    })
  })

  describe('options.validate', () => {
    test('has payload validation', () => {
      expect(createFuel.options.validate).toBeDefined()
      expect(createFuel.options.validate.payload).toBeDefined()
    })

    test('allows unknown fields', () => {
      const payloadSchema = createFuel.options.validate.payload
      const { error } = payloadSchema.validate({
        unknownField: 'value',
        ...fuelExample
      })
      expect(error).toBeUndefined()
    })
  })

  describe('options.pre', () => {
    test('has pre validation', () => {
      expect(createFuel.options.pre).toBeDefined()
      expect(createFuel.options.pre.length).toBeGreaterThan(0)
    })

    test('pre assigns validatedPayload', () => {
      const preStep = createFuel.options.pre[0]
      expect(preStep.assign).toBe('validatedPayload')
    })
  })
})
