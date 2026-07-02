import { beforeEach, describe, test, expect, vi } from 'vitest'
import { updateAppliance } from './update-appliance.js'
import { statusCodes } from '../../common/constants/status-codes.js'

// Mock the controller
vi.mock('../../controllers/appliances-controller.js', () => ({
  default: {},
  updateAppliance: vi.fn()
}))

import * as applianceController from '../../controllers/appliances-controller.js'

describe('PATCH /appliances/{applianceId}', () => {
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
        applianceId: 'APP-123'
      },
      payload: {
        modelName: 'Updated Model'
      },
      db: {},
      logger: {
        info: vi.fn(),
        error: vi.fn()
      }
    }
  })

  describe('handler', () => {
    test('updates appliance successfully', async () => {
      const updatedAppliance = {
        applianceId: 'APP-123',
        modelName: 'Updated Model',
        updatedAt: new Date()
      }

      applianceController.updateAppliance.mockResolvedValueOnce({
        updated: updatedAppliance
      })

      const h = mockToolkit
      const result = await updateAppliance.handler(mockRequest, h)

      expect(result.updated).toEqual(updatedAppliance)
      expect(applianceController.updateAppliance).toHaveBeenCalledWith(
        mockRequest.db,
        'APP-123',
        mockRequest.payload,
        mockRequest.logger
      )
    })

    test('returns 404 when appliance not found', async () => {
      applianceController.updateAppliance.mockResolvedValueOnce({
        notFound: true
      })

      const h = mockToolkit
      const result = await updateAppliance.handler(mockRequest, h)

      expect(result.notFound).toBe(true)
    })

    test('returns 500 on controller error', async () => {
      const error = new Error('Update failed')
      applianceController.updateAppliance.mockRejectedValueOnce(error)

      const h = mockToolkit
      const result = await updateAppliance.handler(mockRequest, h)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Failed to update appliance')
      expect(result.error).toBe('Update failed')
    })

    test('passes payload as updates to controller', async () => {
      const payload = {
        modelName: 'New Model',
        applianceType: 'boiler'
      }
      mockRequest.payload = payload

      applianceController.updateAppliance.mockResolvedValueOnce({
        updated: { applianceId: 'APP-123', ...payload }
      })

      const h = mockToolkit
      await updateAppliance.handler(mockRequest, h)

      expect(applianceController.updateAppliance).toHaveBeenCalledWith(
        expect.anything(),
        'APP-123',
        payload,
        expect.anything()
      )
    })

    test('passes correct applianceId from params', async () => {
      mockRequest.params.applianceId = 'APP-456'

      applianceController.updateAppliance.mockResolvedValueOnce({
        updated: { applianceId: 'APP-456' }
      })

      const h = mockToolkit
      await updateAppliance.handler(mockRequest, h)

      expect(applianceController.updateAppliance).toHaveBeenCalledWith(
        expect.anything(),
        'APP-456',
        expect.anything(),
        expect.anything()
      )
    })

    test('allows empty payload', async () => {
      mockRequest.payload = {}

      applianceController.updateAppliance.mockResolvedValueOnce({
        updated: { applianceId: 'APP-123' }
      })

      const h = mockToolkit
      const result = await updateAppliance.handler(mockRequest, h)

      expect(result.updated).toBeDefined()
    })
  })

  describe('options.method', () => {
    test('route is PATCH', () => {
      expect(updateAppliance.method).toBe('PATCH')
    })
  })

  describe('options.path', () => {
    test('route path includes applianceId parameter', () => {
      expect(updateAppliance.path).toBe('/appliances/{applianceId}')
    })
  })

  describe('options.tags', () => {
    test('includes api and appliances tags', () => {
      expect(updateAppliance.options.tags).toContain('api')
      expect(updateAppliance.options.tags).toContain('appliances')
    })
  })

  describe('options.description', () => {
    test('has description', () => {
      expect(updateAppliance.options.description).toBeDefined()
    })
  })

  describe('options.validate', () => {
    test('validates params', () => {
      expect(updateAppliance.options.validate).toBeDefined()
      expect(updateAppliance.options.validate.params).toBeDefined()
    })

    test('requires applianceId param', () => {
      const paramsSchema = updateAppliance.options.validate.params
      const { error } = paramsSchema.validate({})
      expect(error).toBeDefined()
    })

    test('accepts applianceId param as string', () => {
      const paramsSchema = updateAppliance.options.validate.params
      const { error } = paramsSchema.validate({ applianceId: 'APP-123' })
      expect(error).toBeUndefined()
    })

    test('allows unknown payload fields', () => {
      const payloadSchema = updateAppliance.options.validate.payload
      const { error } = payloadSchema.validate({
        modelName: 'Test',
        unknownField: 'value'
      })
      expect(error).toBeUndefined()
    })
  })
})
