import { beforeEach, describe, test, expect, vi } from 'vitest'
import { updateApplianceTechnicalReviewCheckByPath } from './update-appliance-technical-review-check-by-path.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import * as applianceController from '../../controllers/appliances-controller.js'

vi.mock('../../controllers/appliances-controller.js', () => ({
  default: {},
  updateAppliance: vi.fn()
}))

describe('PATCH /appliances/{id}/{group}/{check}/{state}', () => {
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
        group: 'documentationReviewed',
        check: 'testReports',
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
    test('updates checklist field successfully when state is true', async () => {
      applianceController.updateAppliance.mockResolvedValueOnce({
        updated: {
          id: 'APP-123'
        }
      })

      const h = mockToolkit
      const result = await updateApplianceTechnicalReviewCheckByPath.handler(
        mockRequest,
        h
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

    test('updates checklist field successfully when state is false', async () => {
      applianceController.updateAppliance.mockResolvedValueOnce({
        updated: {
          id: 'APP-123'
        }
      })

      const h = mockToolkit
      const request = {
        ...mockRequest,
        params: {
          ...mockRequest.params,
          state: 'false',
          check: 'technicalDrawings'
        },
        payload: {}
      }

      const result = await updateApplianceTechnicalReviewCheckByPath.handler(
        request,
        h
      )

      expect(result.updated.id).toBe('APP-123')
      expect(result.statusCode).toBe(statusCodes.ok)
      expect(applianceController.updateAppliance).toHaveBeenCalledWith(
        request.db,
        'APP-123',
        {
          'technicalReview.documentationReviewed.technicalDrawings': false
        },
        request.logger
      )
    })

    test('returns 404 when appliance is not found', async () => {
      applianceController.updateAppliance.mockResolvedValueOnce({
        notFound: true
      })

      const h = mockToolkit
      const result = await updateApplianceTechnicalReviewCheckByPath.handler(
        mockRequest,
        h
      )

      expect(result.notFound).toBe(true)
      expect(result.statusCode).toBe(statusCodes.notFound)
    })

    test('returns 500 when controller throws', async () => {
      applianceController.updateAppliance.mockRejectedValueOnce(
        new Error('Database error')
      )

      const h = mockToolkit
      const result = await updateApplianceTechnicalReviewCheckByPath.handler(
        mockRequest,
        h
      )

      expect(result.success).toBe(false)
      expect(result.statusCode).toBe(statusCodes.internalServerError)
    })
  })

  describe('validation', () => {
    test('accepts valid params with matching group and check', () => {
      const paramsSchema =
        updateApplianceTechnicalReviewCheckByPath.options.validate.params

      const { error } = paramsSchema.validate({
        id: 'APP-001',
        group: 'checksCompleted',
        check: 'applianceDetails',
        state: 'false'
      })

      expect(error).toBeUndefined()
    })

    test('rejects invalid check for group', () => {
      const paramsSchema =
        updateApplianceTechnicalReviewCheckByPath.options.validate.params

      const { error } = paramsSchema.validate({
        id: 'APP-001',
        group: 'checksCompleted',
        check: 'testReports',
        state: 'true'
      })

      expect(error).toBeDefined()
    })

    test('rejects invalid state value', () => {
      const paramsSchema =
        updateApplianceTechnicalReviewCheckByPath.options.validate.params

      const { error } = paramsSchema.validate({
        id: 'APP-001',
        group: 'documentationReviewed',
        check: 'testReports',
        state: 'passed'
      })

      expect(error).toBeDefined()
    })

    test('rejects unknown payload keys', () => {
      const payloadSchema =
        updateApplianceTechnicalReviewCheckByPath.options.validate.payload

      const { error } = payloadSchema.validate({
        extraField: 'nope'
      })

      expect(error).toBeDefined()
    })
  })
})
