import { beforeEach, describe, test, expect, vi } from 'vitest'

import { getAdminRecords } from '../get-admin-appliance.js'
import { statusCodes } from '../../../common/constants/status-codes.js'

const { getAdminRecordsMock } = vi.hoisted(() => ({
  getAdminRecordsMock: vi.fn()
}))

vi.mock('../../../controllers/appliances-controller.js', () => ({
  getAdminRecords: getAdminRecordsMock
}))

describe('GET /appliances/{id}/certification', () => {
  let mockRequest
  let mockToolkit

  beforeEach(() => {
    getAdminRecordsMock.mockReset()

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
    expect(getAdminRecords.path).toBe('/admin-appliances/{id}')
  })

  test('returns the certification state when found', async () => {
    getAdminRecordsMock.mockResolvedValue({
      success: true,
      data: {
        id: 'APP-123',
        modelName: 'Twin Heat M20i',
        applianceStatus: 'certified'
      }
    })

    const result = await getAdminRecords.handler(mockRequest, mockToolkit)

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ modelName: 'Twin Heat M20i' }),
        statusCode: statusCodes.ok
      })
    )
  })

  test('passes the id and logger through to the controller', async () => {
    getAdminRecordsMock.mockResolvedValue({ success: true, data: {} })

    await getAdminRecords.handler(mockRequest, mockToolkit)

    expect(getAdminRecordsMock).toHaveBeenCalledWith(
      mockRequest.db,
      'APP-123',
      mockRequest.logger
    )
  })

  test('returns 404 when the appliance does not exist', async () => {
    getAdminRecordsMock.mockResolvedValue({
      success: false,
      message: 'Appliance not found',
      notFound: true
    })

    const result = await getAdminRecords.handler(mockRequest, mockToolkit)

    expect(result.statusCode).toBe(statusCodes.notFound)
  })

  test('returns 409 when the appliance is not yet reviewable', async () => {
    getAdminRecordsMock.mockResolvedValue({
      success: false,
      message: 'Appliance is not yet reviewable',
      notReviewable: true
    })

    const result = await getAdminRecords.handler(mockRequest, mockToolkit)

    expect(result.statusCode).toBe(statusCodes.conflict)
  })

  test('returns a 500 Boom error when the controller throws', async () => {
    getAdminRecordsMock.mockRejectedValue(new Error('db down'))

    const result = await getAdminRecords.handler(mockRequest, mockToolkit)

    expect(result.isBoom).toBe(true)
    expect(result.output.statusCode).toBe(statusCodes.internalServerError)
    expect(mockRequest.logger.error).toHaveBeenCalled()
  })

  test('validates the id param', () => {
    const schema = getAdminRecords.options.validate.params

    expect(schema.validate({ id: 'APP-123' }).error).toBeUndefined()
    expect(schema.validate({}).error).toBeDefined()
  })
})
