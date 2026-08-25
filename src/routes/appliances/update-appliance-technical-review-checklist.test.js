import { beforeEach, describe, test, expect, vi } from 'vitest'
import { updateApplianceTechnicalReviewChecklist } from './update-appliance-technical-review-checklist.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import * as applianceController from '../../controllers/appliances-controller.js'

vi.mock('../../controllers/appliances-controller.js', () => ({
  default: {},
  updateApplianceTechnicalReviewChecklist: vi.fn()
}))

describe('PATCH /appliances/{id}/technical-review/checklist', () => {
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
      payload: {
        documentationReviewed: {
          testReports: true
        }
      },
      db: {},
      logger: {
        info: vi.fn(),
        error: vi.fn()
      }
    }
  })

  describe('handler', () => {
    test('updates checklist field successfully', async () => {
      applianceController.updateApplianceTechnicalReviewChecklist.mockResolvedValueOnce(
        {
          updated: {
            id: 'APP-123'
          }
        }
      )

      const h = mockToolkit
      const result = await updateApplianceTechnicalReviewChecklist.handler(
        mockRequest,
        h
      )

      expect(result.updated.id).toBe('APP-123')
      expect(result.statusCode).toBe(statusCodes.ok)
      expect(
        applianceController.updateApplianceTechnicalReviewChecklist
      ).toHaveBeenCalledWith(
        mockRequest.db,
        'APP-123',
        mockRequest.payload,
        mockRequest.logger
      )
    })

    test('returns 404 when appliance is not found', async () => {
      applianceController.updateApplianceTechnicalReviewChecklist.mockResolvedValueOnce(
        {
          notFound: true
        }
      )

      const h = mockToolkit
      const result = await updateApplianceTechnicalReviewChecklist.handler(
        mockRequest,
        h
      )

      expect(result.notFound).toBe(true)
      expect(result.statusCode).toBe(statusCodes.notFound)
    })

    test('returns 400 when payload is invalid at controller level', async () => {
      applianceController.updateApplianceTechnicalReviewChecklist.mockResolvedValueOnce(
        {
          badRequest: true,
          message: 'Exactly one checklist field must be provided'
        }
      )

      const h = mockToolkit
      const result = await updateApplianceTechnicalReviewChecklist.handler(
        mockRequest,
        h
      )

      expect(result.badRequest).toBe(true)
      expect(result.statusCode).toBe(statusCodes.badRequest)
    })

    test('returns 500 when controller throws', async () => {
      applianceController.updateApplianceTechnicalReviewChecklist.mockRejectedValueOnce(
        new Error('Database error')
      )

      const h = mockToolkit
      const result = await updateApplianceTechnicalReviewChecklist.handler(
        mockRequest,
        h
      )

      expect(result.success).toBe(false)
      expect(result.statusCode).toBe(statusCodes.internalServerError)
    })
  })

  describe('payload validation', () => {
    test('accepts exactly one checklist field set to true', () => {
      const payloadSchema =
        updateApplianceTechnicalReviewChecklist.options.validate.payload

      const { error } = payloadSchema.validate({
        checksCompleted: {
          applianceDetails: true
        }
      })

      expect(error).toBeUndefined()
    })

    test('rejects more than one checklist field', () => {
      const payloadSchema =
        updateApplianceTechnicalReviewChecklist.options.validate.payload

      const { error } = payloadSchema.validate({
        documentationReviewed: {
          testReports: true,
          technicalDrawings: true
        }
      })

      expect(error).toBeDefined()
    })

    test('rejects unknown fields', () => {
      const payloadSchema =
        updateApplianceTechnicalReviewChecklist.options.validate.payload

      const { error } = payloadSchema.validate({
        documentationReviewed: {
          testReports: true
        },
        extraField: 'nope'
      })

      expect(error).toBeDefined()
    })

    test('accepts false values', () => {
      const payloadSchema =
        updateApplianceTechnicalReviewChecklist.options.validate.payload

      const { error } = payloadSchema.validate({
        documentationReviewed: {
          testReports: false
        }
      })

      expect(error).toBeUndefined()
    })
  })
})
