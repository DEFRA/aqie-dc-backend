import { beforeEach, describe, expect, test, vi } from 'vitest'

import { getApplianceActionHistory } from '../get-appliance-action-history.js'
import { statusCodes } from '../../../common/constants/status-codes.js'

const { getActionHistoryMock } = vi.hoisted(() => ({
  getActionHistoryMock: vi.fn()
}))

vi.mock('../../../controllers/action-history-controller.js', () => ({
  getActionHistory: getActionHistoryMock
}))

describe('GET /api/admin/appliances/{id}/action-history', () => {
  let mockRequest
  let mockToolkit

  beforeEach(() => {
    getActionHistoryMock.mockReset()

    mockToolkit = {
      response: vi.fn((data) => ({
        code: vi.fn((code) => ({ ...data, statusCode: code }))
      }))
    }

    mockRequest = {
      params: { id: 'APP-123' },
      query: { page: 1 },
      db: {},
      logger: { info: vi.fn(), error: vi.fn() }
    }
  })

  test('is a GET on the admin path', () => {
    expect(getApplianceActionHistory.method).toBe('GET')
    expect(getApplianceActionHistory.path).toBe(
      '/api/admin/appliances/{id}/action-history'
    )
  })

  test('returns the history when the appliance exists', async () => {
    getActionHistoryMock.mockResolvedValue({
      success: true,
      data: { id: 'APP-123', name: 'Stove', actions: [] }
    })

    const result = await getApplianceActionHistory.handler(
      mockRequest,
      mockToolkit
    )

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ name: 'Stove' }),
        statusCode: statusCodes.ok
      })
    )
  })

  test('asks the controller for an appliance history', async () => {
    getActionHistoryMock.mockResolvedValue({ success: true, data: {} })

    await getApplianceActionHistory.handler(mockRequest, mockToolkit)

    expect(getActionHistoryMock).toHaveBeenCalledWith(
      mockRequest.db,
      'appliance',
      'APP-123',
      mockRequest.logger,
      { page: 1 }
    )
  })

  test('passes the requested page to the controller', async () => {
    getActionHistoryMock.mockResolvedValue({ success: true, data: {} })
    mockRequest.query = { page: 3 }

    await getApplianceActionHistory.handler(mockRequest, mockToolkit)

    expect(getActionHistoryMock).toHaveBeenCalledWith(
      mockRequest.db,
      'appliance',
      'APP-123',
      mockRequest.logger,
      { page: 3 }
    )
  })

  test('validates the page query, defaulting to 1', () => {
    const { query } = getApplianceActionHistory.options.validate

    expect(query.validate({}).value).toEqual({ page: 1 })
    expect(query.validate({ page: '2' }).value).toEqual({ page: 2 })
    expect(query.validate({ page: 0 }).error).toBeDefined()
    expect(query.validate({ page: 1.5 }).error).toBeDefined()
    expect(query.validate({ limit: 50 }).error).toBeDefined()
  })

  test('returns 404 when the appliance does not exist', async () => {
    getActionHistoryMock.mockResolvedValue({
      success: false,
      message: 'Appliance not found',
      notFound: true
    })

    const result = await getApplianceActionHistory.handler(
      mockRequest,
      mockToolkit
    )

    expect(result.statusCode).toBe(statusCodes.notFound)
  })

  test('turns an unexpected failure into a user-safe 500', async () => {
    getActionHistoryMock.mockRejectedValue(new Error('db exploded'))

    const result = await getApplianceActionHistory.handler(
      mockRequest,
      mockToolkit
    )

    expect(result.isBoom).toBe(true)
    expect(result.output.statusCode).toBe(statusCodes.internalServerError)
    expect(result.message).not.toContain('db exploded')
  })

  test('validates the id parameter', () => {
    const { params } = getApplianceActionHistory.options.validate

    expect(params.validate({ id: 'APP-123' }).error).toBeUndefined()
    expect(params.validate({}).error).toBeDefined()
    expect(params.validate({ id: 'x'.repeat(65) }).error).toBeDefined()
  })
})
