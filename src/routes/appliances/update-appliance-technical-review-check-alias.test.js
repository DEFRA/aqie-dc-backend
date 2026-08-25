import { beforeEach, describe, test, expect, vi } from 'vitest'
import { updateApplianceTechnicalReviewCheckByAlias } from './update-appliance-technical-review-check-alias.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import * as applianceController from '../../controllers/appliances-controller.js'

vi.mock('../../controllers/appliances-controller.js', () => ({
  default: {},
  updateAppliance: vi.fn()
}))

describe('PATCH /appliances/{id}/{checkname}/{state}', () => {
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
        id: 'APP-123',
        checkname: 'testReports',
        state: 'true'
      },
      payload: {},
      db: {},
      logger: {
        info: vi.fn(),
        error: vi.fn()
      }
    }
  })

  describe('handler', () => {
    test('updates documentationReviewed checklist field', async () => {
      applianceController.updateAppliance.mockResolvedValueOnce({
        updated: {
          id: 'APP-123'
        }
      })

      const result = await updateApplianceTechnicalReviewCheckByAlias.handler(
        mockRequest,
        mockToolkit
      )

      expect(result.updated.id).toBe('APP-123')
      expect(result.statusCode).toBe(statusCodes.ok)
      expect(applianceController.updateAppliance).toHaveBeenCalledWith(
        mockRequest.db,
        'APP-123',
        {
          'technicalReview.documentationReviewed.testReports': true
        },
        mockRequest.logger
      )
    })

    test('updates checksCompleted checklist field', async () => {
      applianceController.updateAppliance.mockResolvedValueOnce({
        updated: {
          id: 'APP-123'
        }
      })

      const request = {
        ...mockRequest,
        params: {
          id: 'APP-123',
          checkname: 'applianceDetails',
          state: 'false'
        }
      }

      const result = await updateApplianceTechnicalReviewCheckByAlias.handler(
        request,
        mockToolkit
      )

      expect(result.updated.id).toBe('APP-123')
      expect(result.statusCode).toBe(statusCodes.ok)
      expect(applianceController.updateAppliance).toHaveBeenCalledWith(
        request.db,
        'APP-123',
        {
          'technicalReview.checksCompleted.applianceDetails': false
        },
        request.logger
      )
    })

    test('returns 404 when appliance is not found', async () => {
      applianceController.updateAppliance.mockResolvedValueOnce({
        notFound: true
      })

      const result = await updateApplianceTechnicalReviewCheckByAlias.handler(
        mockRequest,
        mockToolkit
      )

      expect(result.notFound).toBe(true)
      expect(result.statusCode).toBe(statusCodes.notFound)
    })

    test('returns 500 when controller throws', async () => {
      applianceController.updateAppliance.mockRejectedValueOnce(
        new Error('Database error')
      )

      const result = await updateApplianceTechnicalReviewCheckByAlias.handler(
        mockRequest,
        mockToolkit
      )

      expect(result.success).toBe(false)
      expect(result.statusCode).toBe(statusCodes.internalServerError)
    })
  })

  describe('validation', () => {
    test('accepts valid params', () => {
      const paramsSchema =
        updateApplianceTechnicalReviewCheckByAlias.options.validate.params

      const { error } = paramsSchema.validate({
        id: 'APP-001',
        checkname: 'instructionManual',
        state: 'false'
      })

      expect(error).toBeUndefined()
    })

    test('rejects invalid checklist field name', () => {
      const paramsSchema =
        updateApplianceTechnicalReviewCheckByAlias.options.validate.params

      const { error } = paramsSchema.validate({
        id: 'APP-001',
        checkname: 'unknownCheck',
        state: 'true'
      })

      expect(error).toBeDefined()
    })

    test('rejects invalid state value', () => {
      const paramsSchema =
        updateApplianceTechnicalReviewCheckByAlias.options.validate.params

      const { error } = paramsSchema.validate({
        id: 'APP-001',
        checkname: 'testReports',
        state: 'pass'
      })

      expect(error).toBeDefined()
    })

    test('rejects unknown payload keys', () => {
      const payloadSchema =
        updateApplianceTechnicalReviewCheckByAlias.options.validate.payload

      const { error } = payloadSchema.validate({
        extraField: 'nope'
      })

      expect(error).toBeDefined()
    })
  })
})
