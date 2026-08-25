/**
 * Update one appliance technical review checklist field using path params.
 */

import Joi from 'joi'
import * as applianceController from '../../controllers/appliances-controller.js'
import { statusCodes } from '../../common/constants/status-codes.js'

const checklistFieldMap = {
  documentationReviewed: [
    'testReports',
    'technicalDrawings',
    'conformityMark',
    'instructionManual'
  ],
  checksCompleted: [
    'applianceDetails',
    'permittedFuels',
    'additionalConditions'
  ]
}

const updateByPathParamsSchema = Joi.object({
  id: Joi.string().required(),
  group: Joi.string()
    .valid(...Object.keys(checklistFieldMap))
    .required(),
  check: Joi.string().required(),
  state: Joi.string().valid('true', 'false').required()
})
  .custom((value, helpers) => {
    const validChecks = checklistFieldMap[value.group]

    if (!validChecks.includes(value.check)) {
      return helpers.error('any.invalid')
    }

    return value
  }, 'group and check compatibility validation')
  .messages({
    'any.invalid': 'Invalid checklist field for the provided group'
  })

const updateByPathPayloadSchema = Joi.object({
  // Keep payload empty for this route to make updates URL-driven only.
})
  .optional()
  .unknown(false)

export const updateApplianceTechnicalReviewCheckByPath = {
  method: 'PATCH',
  path: '/appliances/{id}/{group}/{check}/{state}',
  options: {
    auth: false,
    tags: ['api', 'appliances'],
    description:
      'Update one technical review checklist field using URL path params',
    validate: {
      params: updateByPathParamsSchema,
      payload: updateByPathPayloadSchema
    }
  },
  handler: async (request, h) => {
    const { id, group, check, state } = request.params

    const checklistFieldPath = `technicalReview.${group}.${check}`
    const updates = {
      [checklistFieldPath]: state === 'true'
    }

    try {
      const result = await applianceController.updateAppliance(
        request.db,
        id,
        updates,
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
