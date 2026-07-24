import { beforeEach, describe, test, expect, vi } from 'vitest'
import { createAppliance } from './create-appliance.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import applianceExample from '../../sample-data/appliance-example.js'
import * as applianceController from '../../controllers/appliances-controller.js'

// Mock the controller
vi.mock('../../controllers/appliances-controller.js', () => ({
  default: {},
  createAppliance: vi.fn()
}))

describe('POST /appliances', () => {
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
        validatedPayload: applianceExample
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
    test('creates appliance successfully and returns 201', async () => {
      const mockId = 'APP-123456'
      applianceController.createAppliance.mockResolvedValueOnce({
        success: true,
        message: 'Appliance created successfully',
        data: {
          applianceId: mockId,
          ...applianceExample
        }
      })

      const h = mockToolkit
      const result = await createAppliance.handler(mockRequest, h)

      expect(result.success).toBe(true)
      expect(result.message).toBe('Appliance created successfully')
      expect(result.data.applianceId).toBe(mockId)
      expect(result.statusCode).toBe(statusCodes.created)
      expect(applianceController.createAppliance).toHaveBeenCalledWith(
        mockRequest.db,
        applianceExample,
        mockRequest.logger
      )
    })

    test('returns 500 when controller throws error', async () => {
      const error = new Error('Database error')
      applianceController.createAppliance.mockRejectedValueOnce(error)

      const h = mockToolkit
      const result = await createAppliance.handler(mockRequest, h)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Failed to create appliance')
      expect(result.error).toBe('Database error')
      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        error,
        'Failed to create appliance'
      )
    })

    test('returns request.pre.validatedPayload as newItem', async () => {
      const customPayload = {
        ...applianceExample,
        modelName: 'Custom Model'
      }
      mockRequest.pre.validatedPayload = customPayload

      applianceController.createAppliance.mockResolvedValueOnce({
        success: true,
        message: 'Appliance created successfully',
        data: { applianceId: 'APP-123' }
      })

      const h = mockToolkit
      await createAppliance.handler(mockRequest, h)

      expect(applianceController.createAppliance).toHaveBeenCalledWith(
        mockRequest.db,
        customPayload,
        mockRequest.logger
      )
    })

    test('includes applianceId in response data', async () => {
      const applianceId = 'APP-xyz789'
      applianceController.createAppliance.mockResolvedValueOnce({
        success: true,
        message: 'Appliance created successfully',
        data: {
          applianceId,
          ...applianceExample
        }
      })

      const h = mockToolkit
      const result = await createAppliance.handler(mockRequest, h)

      expect(result.data).toEqual({ applianceId })
    })
  })

  describe('options.method', () => {
    test('route is POST', () => {
      expect(createAppliance.method).toBe('POST')
    })
  })

  describe('options.path', () => {
    test('route path is /appliances', () => {
      expect(createAppliance.path).toBe('/appliances')
    })
  })

  describe('options.tags', () => {
    test('includes api and appliances tags', () => {
      expect(createAppliance.options.tags).toContain('api')
      expect(createAppliance.options.tags).toContain('appliances')
    })
  })

  describe('options.description', () => {
    test('has description', () => {
      expect(createAppliance.options.description).toBeDefined()
    })
  })

  describe('options.validate', () => {
    test('has payload validation', () => {
      expect(createAppliance.options.validate).toBeDefined()
      expect(createAppliance.options.validate.payload).toBeDefined()
    })

    test('allows unknown fields', () => {
      const payloadSchema = createAppliance.options.validate.payload
      const { error } = payloadSchema.validate({
        unknownField: 'value',
        ...applianceExample
      })
      expect(error).toBeUndefined()
    })
  })

  describe('options.pre', () => {
    test('has pre validation', () => {
      expect(createAppliance.options.pre).toBeDefined()
      expect(createAppliance.options.pre.length).toBeGreaterThan(0)
    })

    test('pre assigns validatedPayload', () => {
      const preStep = createAppliance.options.pre[0]
      expect(preStep.assign).toBe('validatedPayload')
    })
  })
})
