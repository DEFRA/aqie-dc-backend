/**
 * Update one appliance technical review checklist field
 */

import Joi from 'joi'
import * as applianceController from '../../controllers/appliances-controller.js'
import { statusCodes } from '../../common/constants/status-codes.js'

const checklistPayloadSchema = Joi.object({
  documentationReviewed: Joi.object({
    testReports: Joi.boolean(),
    technicalDrawings: Joi.boolean(),
    conformityMark: Joi.boolean(),
    instructionManual: Joi.boolean()
  })
    .optional()
    .unknown(false),
  checksCompleted: Joi.object({
    applianceDetails: Joi.boolean(),
    permittedFuels: Joi.boolean(),
    additionalConditions: Joi.boolean()
  })
    .optional()
    .unknown(false),
  reviewedBy: Joi.object({
    name: Joi.string().optional().allow(null),
    email: Joi.string().email().optional().allow(null)
  })
    .optional()
    .allow(null)
    .unknown(false)
})
  .unknown(false)
  .custom((value, helpers) => {
    const documentationReviewedCount = Object.keys(
      value.documentationReviewed ?? {}
    ).length

    const checksCompletedCount = Object.keys(value.checksCompleted ?? {}).length

    const total = documentationReviewedCount + checksCompletedCount

    if (total !== 1) {
      return helpers.error('any.invalid')
    }

    return value
  }, 'single checklist field validation')
  .messages({
    'any.invalid': 'Exactly one checklist field must be provided'
  })

export const updateApplianceTechnicalReviewChecklist = {
  method: 'PATCH',
  path: '/appliances/{id}/technical-review/checklist',
  options: {
    auth: false,
    tags: ['api', 'appliances'],
    description:
      'Update exactly one technical review checklist field for an appliance',
    validate: {
      params: Joi.object({
        id: Joi.string().required()
      }),
      payload: checklistPayloadSchema
    }
  },
  handler: async (request, h) => {
    const { id } = request.params

    try {
      const result =
        await applianceController.updateApplianceTechnicalReviewChecklist(
          request.db,
          id,
          request.payload,
          request.logger
        )

      if (result.notFound) {
        return h.response(result).code(statusCodes.notFound)
      }

      if (result.badRequest) {
        return h.response(result).code(statusCodes.badRequest)
      }

      return h.response(result).code(statusCodes.ok)
    } catch (err) {
      return h
        .response({
          success: false,
          message: 'Failed to update appliance technical review checklist',
          error: err.message
        })
        .code(statusCodes.internalServerError)
    }
  }
}
