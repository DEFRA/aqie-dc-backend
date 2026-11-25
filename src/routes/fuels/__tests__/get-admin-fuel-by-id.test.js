import Boom from '@hapi/boom'
import { beforeEach, describe, test, expect, vi } from 'vitest'
import { getAdminFuelById } from '#src/routes/fuels/get-admin-fuel-by-id.js'
import { statusCodes } from '#src/common/constants/status-codes.js'
import * as fuelController from '#src/controllers/fuels-controller.js'

vi.mock('#src/controllers/fuels-controller.js', () => ({
  default: {},
  getAdminFuelById: vi.fn()
}))

describe('GET /admin/fuels/{id}', () => {
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
      params: { id: 'FUEL-001' },
      db: {},
      logger: { info: vi.fn(), error: vi.fn() }
    }
  })

  test('returns the admin fuel record', async () => {
    const data = { id: 'FUEL-001', name: 'Cosytherm', status: 'live' }
    fuelController.getAdminFuelById.mockResolvedValueOnce({
      success: true,
      data
    })

    const result = await getAdminFuelById.handler(mockRequest, mockToolkit)

    expect(result.data).toEqual(data)
    expect(result.statusCode).toBe(statusCodes.ok)
    expect(fuelController.getAdminFuelById).toHaveBeenCalledWith(
      mockRequest.db,
      'FUEL-001',
      mockRequest.logger
    )
  })

  test('returns 404 when the fuel does not exist', async () => {
    fuelController.getAdminFuelById.mockResolvedValueOnce({
      success: false,
      message: 'Fuel not found',
      notFound: true
    })

    const result = await getAdminFuelById.handler(mockRequest, mockToolkit)

    expect(result.statusCode).toBe(statusCodes.notFound)
  })

  test('rethrows Boom errors', async () => {
    fuelController.getAdminFuelById.mockRejectedValueOnce(
      Boom.forbidden('nope')
    )

    await expect(
      getAdminFuelById.handler(mockRequest, mockToolkit)
    ).rejects.toThrow('nope')
  })

  test('returns bad gateway for upstream failures', async () => {
    const error = new Error('upstream down')
    error.status = statusCodes.internalServerError
    fuelController.getAdminFuelById.mockRejectedValueOnce(error)

    const result = await getAdminFuelById.handler(mockRequest, mockToolkit)

    expect(result.output.statusCode).toBe(statusCodes.badGateway)
  })

  test('returns internal error for unexpected failures', async () => {
    fuelController.getAdminFuelById.mockRejectedValueOnce(new Error('boom'))

    const result = await getAdminFuelById.handler(mockRequest, mockToolkit)

    expect(result.output.statusCode).toBe(statusCodes.internalServerError)
  })

  test('requires an id', () => {
    const { params } = getAdminFuelById.options.validate
    expect(params.validate({}).error).toBeDefined()
    expect(params.validate({ id: 'FUEL-001' }).error).toBeUndefined()
  })
})
