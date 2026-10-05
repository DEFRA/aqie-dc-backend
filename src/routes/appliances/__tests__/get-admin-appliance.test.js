import { beforeEach, describe, test, expect, vi } from 'vitest'

import { getApplianceCertification } from '../get-admin-appliance.js'
import { statusCodes } from '../../../common/constants/status-codes.js'

const { getApplianceCertificationMock } = vi.hoisted(() => ({
  getApplianceCertificationMock: vi.fn()
}))

vi.mock('../../../controllers/appliances-controller.js', () => ({
  getApplianceCertification: getApplianceCertificationMock
}))

describe('GET /appliances/{id}/certification', () => {
  let mockRequest
  let mockToolkit

  beforeEach(() => {
    getApplianceCertificationMock.mockReset()

    mockToolkit = {
      response: vi.fn((data) => ({
        code: vi.fn((code) => ({ ...data, statusCode: code }))
      }))
    }

    mockRequest = {
      params: { id: 'APP-123' },
      db: {},
      logger: { info: vi.fn(), error: vi.fn() }
    }
  })

  test('uses the admin appliance route path', () => {
    expect(getApplianceCertification.path).toBe('/admin-appliances/{id}')
  })

  test('returns the certification state when found', async () => {
    getApplianceCertificationMock.mockResolvedValue({
      success: true,
      data: {
        id: 'APP-123',
        modelName: 'Twin Heat M20i',
        applianceStatus: 'certified'
      }
    })

    const result = await getApplianceCertification.handler(
      mockRequest,
      mockToolkit
    )

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ modelName: 'Twin Heat M20i' }),
        statusCode: statusCodes.ok
      })
    )
  })

  test('passes the id and logger through to the controller', async () => {
    getApplianceCertificationMock.mockResolvedValue({ success: true, data: {} })

    await getApplianceCertification.handler(mockRequest, mockToolkit)

    expect(getApplianceCertificationMock).toHaveBeenCalledWith(
      mockRequest.db,
      'APP-123',
      mockRequest.logger
    )
  })

  test('returns 404 when the appliance does not exist', async () => {
    getApplianceCertificationMock.mockResolvedValue({
      success: false,
      message: 'Appliance not found',
      notFound: true
    })

    const result = await getApplianceCertification.handler(
      mockRequest,
      mockToolkit
    )

    expect(result.statusCode).toBe(statusCodes.notFound)
  })

  test('returns a 500 Boom error when the controller throws', async () => {
    getApplianceCertificationMock.mockRejectedValue(new Error('db down'))

    const result = await getApplianceCertification.handler(
      mockRequest,
      mockToolkit
    )

    expect(result.isBoom).toBe(true)
    expect(result.output.statusCode).toBe(statusCodes.internalServerError)
    expect(mockRequest.logger.error).toHaveBeenCalled()
  })

  test('validates the id param', () => {
    const schema = getApplianceCertification.options.validate.params

    expect(schema.validate({ id: 'APP-123' }).error).toBeUndefined()
    expect(schema.validate({}).error).toBeDefined()
  })
})
