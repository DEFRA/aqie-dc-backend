import { beforeEach, describe, test, expect, vi } from 'vitest'

import { updateApplianceVisibility } from '../update-appliance-visibility.js'
import { statusCodes } from '../../../common/constants/status-codes.js'

const { updateApplianceVisibilityMock } = vi.hoisted(() => ({
  updateApplianceVisibilityMock: vi.fn()
}))

vi.mock('../../../controllers/appliances-controller.js', () => ({
  updateApplianceVisibility: updateApplianceVisibilityMock
}))

describe('PATCH /appliances/{id}/visibility', () => {
  let mockRequest
  let mockToolkit

  beforeEach(() => {
    updateApplianceVisibilityMock.mockReset()

    mockToolkit = {
      response: vi.fn((data) => ({
        code: vi.fn((code) => ({ ...data, statusCode: code }))
      }))
    }

    mockRequest = {
      params: { id: 'APP-123' },
      payload: { isVisibleToPublic: false },
      db: {},
      logger: { info: vi.fn(), error: vi.fn() }
    }
  })

  describe('handler', () => {
    test('returns 200 with the recalculated status', async () => {
      updateApplianceVisibilityMock.mockResolvedValue({
        success: true,
        data: {
          id: 'APP-123',
          isVisibleToPublic: false,
          applianceStatus: 'hidden'
        }
      })

      const result = await updateApplianceVisibility.handler(
        mockRequest,
        mockToolkit
      )

      expect(result.statusCode).toBe(statusCodes.ok)
      expect(updateApplianceVisibilityMock).toHaveBeenCalledWith(
        mockRequest.db,
        'APP-123',
        false,
        mockRequest.logger
      )
    })

    test('returns 404 when the appliance is not found', async () => {
      updateApplianceVisibilityMock.mockResolvedValue({
        success: false,
        notFound: true
      })

      const result = await updateApplianceVisibility.handler(
        mockRequest,
        mockToolkit
      )

      expect(result.statusCode).toBe(statusCodes.notFound)
    })

    test('returns 409 when the appliance cannot be toggled', async () => {
      updateApplianceVisibilityMock.mockResolvedValue({
        success: false,
        incomplete: true
      })

      const result = await updateApplianceVisibility.handler(
        mockRequest,
        mockToolkit
      )

      expect(result.statusCode).toBe(statusCodes.conflict)
    })

    test('returns 500 and logs on controller error', async () => {
      const error = new Error('Database error')
      updateApplianceVisibilityMock.mockRejectedValue(error)

      const result = await updateApplianceVisibility.handler(
        mockRequest,
        mockToolkit
      )

      expect(result.isBoom).toBe(true)
      expect(result.output.statusCode).toBe(statusCodes.internalServerError)
      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        error,
        'Failed to update appliance visibility'
      )
    })
  })

  describe('payload validation', () => {
    const validatePayload = (payload) =>
      updateApplianceVisibility.options.validate.payload.validate(payload)

    test.each([true, false])('accepts isVisibleToPublic: %s', (value) => {
      expect(
        validatePayload({ isVisibleToPublic: value }).error
      ).toBeUndefined()
    })

    test('requires isVisibleToPublic', () => {
      expect(validatePayload({}).error).toBeDefined()
    })

    test('rejects non-boolean values', () => {
      expect(
        validatePayload({ isVisibleToPublic: 'false' }).error
      ).toBeDefined()
    })

    test('rejects unknown keys', () => {
      const { error } = validatePayload({
        isVisibleToPublic: true,
        applianceStatus: 'live'
      })

      expect(error).toBeDefined()
    })
  })

  test('route configuration', () => {
    expect(updateApplianceVisibility.method).toBe('PATCH')
    expect(updateApplianceVisibility.path).toBe('/appliances/{id}/visibility')
  })
})
