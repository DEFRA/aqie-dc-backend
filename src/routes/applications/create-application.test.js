import { beforeEach, describe, test, expect, vi } from 'vitest'
import { createApplication } from './create-application.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import applicationExample from '../../sample-data/application-example.js'
import * as applicationsController from '../../controllers/applications-controller.js'

// Mock the controller
vi.mock('../../controllers/applications-controller.js', () => ({
  default: {},
  createApplication: vi.fn()
}))

describe('POST /applications', () => {
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
      payload: applicationExample,
      pre: { validatedPayload: applicationExample },
      db: {},
      server: {
        mongoClient: {}
      },
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn()
      }
    }
  })

  describe('handler', () => {
    test('creates application successfully and returns 201', async () => {
      const mockResult = {
        success: true,
        message: 'Application and appliances created successfully',
        data: {
          applicationId: 'uuid-123',
          applicationType: 'appliance',
          status: 'new',
          appliances: applicationExample.appliances
        }
      }

      applicationsController.createApplication.mockResolvedValueOnce(mockResult)

      const h = mockToolkit
      const result = await createApplication.handler(mockRequest, h)

      expect(result.success).toBe(true)
      expect(result.message).toBe(
        'Application and appliances created successfully'
      )
      expect(result.data.applicationId).toBe('uuid-123')
      expect(result.statusCode).toBe(statusCodes.created)
      expect(applicationsController.createApplication).toHaveBeenCalledWith(
        mockRequest.server.mongoClient,
        mockRequest.db,
        applicationExample,
        mockRequest.logger
      )
    })

    test('returns a generic 500 Boom error when controller throws', async () => {
      const error = new Error('Database error')
      applicationsController.createApplication.mockRejectedValueOnce(error)

      const h = mockToolkit
      const result = await createApplication.handler(mockRequest, h)

      expect(result.isBoom).toBe(true)
      expect(result.output.statusCode).toBe(statusCodes.internalServerError)
      expect(result.message).toBe('Failed to create application')
      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        error,
        'Failed to create application'
      )
    })

    test('passes validatedPayload from pre to controller', async () => {
      const customPayload = {
        ...applicationExample,
        applicationType: 'fuel'
      }
      mockRequest.payload = customPayload
      mockRequest.pre = { validatedPayload: customPayload }

      applicationsController.createApplication.mockResolvedValueOnce({
        success: true,
        message: 'Application and appliances created successfully',
        data: { applicationId: 'uuid-456' }
      })

      const h = mockToolkit
      await createApplication.handler(mockRequest, h)

      expect(applicationsController.createApplication).toHaveBeenCalledWith(
        mockRequest.server.mongoClient,
        mockRequest.db,
        customPayload,
        mockRequest.logger
      )
    })

    test('includes appliances in response data', async () => {
      const mockResult = {
        success: true,
        message: 'Application and appliances created successfully',
        data: {
          applicationId: 'uuid-123',
          applicationType: 'appliance',
          appliances: [
            { applianceId: 'APP-001', companyName: 'ACME' },
            { applianceId: 'APP-002', companyName: 'Beta' }
          ]
        }
      }

      applicationsController.createApplication.mockResolvedValueOnce(mockResult)

      const h = mockToolkit
      const result = await createApplication.handler(mockRequest, h)

      expect(result.data.appliances).toHaveLength(2)
      expect(result.data.appliances[0].applianceId).toBe('APP-001')
    })

    test('logs error when controller throws', async () => {
      const error = new Error('Transaction failed')
      applicationsController.createApplication.mockRejectedValueOnce(error)

      const h = mockToolkit
      const result = await createApplication.handler(mockRequest, h)

      expect(result.isBoom).toBe(true)
      expect(result.output.statusCode).toBe(statusCodes.internalServerError)
      expect(result.message).toBe('Failed to create application')
      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        error,
        'Failed to create application'
      )
    })
  })

  describe('options.method', () => {
    test('route is POST', () => {
      expect(createApplication.method).toBe('POST')
    })
  })

  describe('options.path', () => {
    test('route path is /applications', () => {
      expect(createApplication.path).toBe('/applications')
    })
  })

  describe('options.tags', () => {
    test('includes api and applications tags', () => {
      expect(createApplication.options.tags).toContain('api')
      expect(createApplication.options.tags).toContain('applications')
    })
  })

  describe('options.description', () => {
    test('has description', () => {
      expect(createApplication.options.description).toBeDefined()
      expect(createApplication.options.description).toContain('Create')
    })
  })

  describe('options.validate', () => {
    test('has payload validation', () => {
      expect(createApplication.options.validate).toBeDefined()
      expect(createApplication.options.validate.payload).toBeDefined()
    })

    test('payload validation includes example', () => {
      const validation = createApplication.options.validate.payload
      expect(validation).toBeDefined()
    })
  })

  describe('options.pre', () => {
    test('has pre validation hook', () => {
      expect(createApplication.options.pre).toBeDefined()
      expect(Array.isArray(createApplication.options.pre)).toBe(true)
      expect(createApplication.options.pre.length).toBeGreaterThan(0)
    })

    test('pre hook assigns validatedPayload', () => {
      const preHook = createApplication.options.pre.find(
        (p) => p.assign === 'validatedPayload'
      )
      expect(preHook).toBeDefined()
    })

    test('pre hook has failAction for validation errors', () => {
      const preHook = createApplication.options.pre.find(
        (p) => p.assign === 'validatedPayload'
      )
      expect(preHook.failAction).toBeDefined()
    })
  })
})
