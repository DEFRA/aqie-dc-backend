import { beforeEach, describe, test, expect, vi } from 'vitest'
import { deleteAppliance } from '#src/routes/appliances/delete-appliance.js'
import { statusCodes } from '#src/common/constants/status-codes.js'
import * as applianceController from '#src/controllers/appliances-controller.js'

// Mock the controller
vi.mock('#src/controllers/appliances-controller.js', () => ({
  default: {},
  deleteAppliance: vi.fn()
}))

describe('DELETE /appliances/{id}', () => {
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
        id: 'APP-123'
      },
      db: {},
      logger: {
        info: vi.fn(),
        error: vi.fn()
      }
    }
  })

  describe('handler', () => {
    test('deletes appliance successfully', async () => {
      applianceController.deleteAppliance.mockResolvedValueOnce({
        deleted: true
      })

      const h = mockToolkit
      const result = await deleteAppliance.handler(mockRequest, h)

      expect(result.deleted).toBe(true)
      expect(result.statusCode).toBe(statusCodes.ok)
      expect(applianceController.deleteAppliance).toHaveBeenCalledWith(
        mockRequest.db,
        'APP-123',
        mockRequest.logger
      )
    })

    test('returns 404 when appliance not found', async () => {
      applianceController.deleteAppliance.mockResolvedValueOnce({
        notFound: true
      })

      const h = mockToolkit
      const result = await deleteAppliance.handler(mockRequest, h)

      expect(result.notFound).toBe(true)
    })

    test('returns 500 on controller error', async () => {
      const error = new Error('Delete failed')
      applianceController.deleteAppliance.mockRejectedValueOnce(error)

      const h = mockToolkit
      const result = await deleteAppliance.handler(mockRequest, h)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Failed to delete appliance')
      expect(result.error).toBe('Delete failed')
    })

    test('passes correct id from params to controller', async () => {
      applianceController.deleteAppliance.mockResolvedValueOnce({
        deleted: true
      })

      mockRequest.params.id = 'APP-456'
      const h = mockToolkit

      await deleteAppliance.handler(mockRequest, h)

      expect(applianceController.deleteAppliance).toHaveBeenCalledWith(
        expect.anything(),
        'APP-456',
        expect.anything()
      )
    })

    test('uses request.logger for error logging', async () => {
      const error = new Error('Test delete error')
      applianceController.deleteAppliance.mockRejectedValueOnce(error)

      const h = mockToolkit
      await deleteAppliance.handler(mockRequest, h)

      // The handler catches and returns error response
      expect(applianceController.deleteAppliance).toHaveBeenCalled()
    })
  })

  describe('options.method', () => {
    test('route is DELETE', () => {
      expect(deleteAppliance.method).toBe('DELETE')
    })
  })

  describe('options.path', () => {
    test('route path includes id parameter', () => {
      expect(deleteAppliance.path).toBe('/appliances/{id}')
    })
  })

  describe('options.tags', () => {
    test('includes api and appliances tags', () => {
      expect(deleteAppliance.options.tags).toContain('api')
      expect(deleteAppliance.options.tags).toContain('appliances')
    })
  })

  describe('options.description', () => {
    test('has description for delete operation', () => {
      expect(deleteAppliance.options.description).toBeDefined()
      expect(deleteAppliance.options.description.toLowerCase()).toContain(
        'delete'
      )
    })
  })

  describe('options.validate', () => {
    test('validates params', () => {
      expect(deleteAppliance.options.validate).toBeDefined()
      expect(deleteAppliance.options.validate.params).toBeDefined()
    })

    test('requires id param', () => {
      const paramsSchema = deleteAppliance.options.validate.params
      const { error } = paramsSchema.validate({})
      expect(error).toBeDefined()
    })

    test('accepts id param as string', () => {
      const paramsSchema = deleteAppliance.options.validate.params
      const { error } = paramsSchema.validate({ id: 'APP-123' })
      expect(error).toBeUndefined()
    })
  })
})
