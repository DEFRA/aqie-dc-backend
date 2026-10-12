import Boom from '@hapi/boom'
import { beforeEach, describe, test, expect, vi } from 'vitest'
import { getAdminApplianceById } from '#src/routes/appliances/get-admin-appliance-by-id.js'
import { statusCodes } from '#src/common/constants/status-codes.js'
import * as applianceController from '#src/controllers/appliances-controller.js'

vi.mock('#src/controllers/appliances-controller.js', () => ({
  default: {},
  getAdminApplianceById: vi.fn()
}))

describe('GET /api/admin/appliances/{id}', () => {
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
      params: { id: 'APP-001' },
      db: {},
      logger: {
        info: vi.fn(),
        error: vi.fn()
      }
    }
  })

  test('returns the admin appliance record', async () => {
    const data = {
      id: 'APP-001',
      modelName: 'Eco Boiler 2000',
      modelNumber: 'EB-2000',
      applicationId: 'APPL-001',
      certifications: {
        england: 'certified',
        scotland: 'new',
        wales: 'new',
        northernIreland: 'new'
      },
      status: 'live'
    }

    applianceController.getAdminApplianceById.mockResolvedValueOnce({
      success: true,
      data
    })

    const result = await getAdminApplianceById.handler(mockRequest, mockToolkit)

    expect(result.success).toBe(true)
    expect(result.data).toEqual(data)
    expect(result.statusCode).toBe(statusCodes.ok)
    expect(applianceController.getAdminApplianceById).toHaveBeenCalledWith(
      mockRequest.db,
      'APP-001',
      mockRequest.logger
    )
  })

  test('returns 404 when the appliance does not exist', async () => {
    applianceController.getAdminApplianceById.mockResolvedValueOnce({
      success: false,
      message: 'Appliance not found',
      notFound: true
    })

    const result = await getAdminApplianceById.handler(mockRequest, mockToolkit)

    expect(result.statusCode).toBe(statusCodes.notFound)
    expect(result.success).toBe(false)
  })

  test('rethrows Boom errors', async () => {
    applianceController.getAdminApplianceById.mockRejectedValueOnce(
      Boom.forbidden('nope')
    )

    await expect(
      getAdminApplianceById.handler(mockRequest, mockToolkit)
    ).rejects.toThrow('nope')
    expect(mockRequest.logger.error).toHaveBeenCalled()
  })

  test('returns bad gateway for upstream failures', async () => {
    const error = new Error('upstream down')
    error.status = statusCodes.internalServerError
    applianceController.getAdminApplianceById.mockRejectedValueOnce(error)

    const result = await getAdminApplianceById.handler(mockRequest, mockToolkit)

    expect(result.isBoom).toBe(true)
    expect(result.output.statusCode).toBe(statusCodes.badGateway)
  })

  test('returns internal error for unexpected failures', async () => {
    applianceController.getAdminApplianceById.mockRejectedValueOnce(
      new Error('boom')
    )

    const result = await getAdminApplianceById.handler(mockRequest, mockToolkit)

    expect(result.isBoom).toBe(true)
    expect(result.output.statusCode).toBe(statusCodes.internalServerError)
  })

  describe('validation', () => {
    const { params } = getAdminApplianceById.options.validate

    test('requires an id', () => {
      expect(params.validate({}).error).toBeDefined()
    })

    test('accepts a valid id', () => {
      expect(params.validate({ id: 'APP-001' }).error).toBeUndefined()
    })
  })
})
