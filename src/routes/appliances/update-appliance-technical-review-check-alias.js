/**
 * Update one appliance technical review checklist field using short alias path.
 */

import Joi from 'joi'
import * as applianceController from '../../controllers/appliances-controller.js'
import { statusCodes } from '../../common/constants/status-codes.js'

const checklistGroupByCheckName = {
  testReports: 'documentationReviewed',
  technicalDrawings: 'documentationReviewed',
  conformityMark: 'documentationReviewed',
  instructionManual: 'documentationReviewed',
  applianceDetails: 'checksCompleted',
  permittedFuels: 'checksCompleted',
  additionalConditions: 'checksCompleted'
}

const aliasParamsSchema = Joi.object({
  id: Joi.string().required(),
  checkname: Joi.string()
    .valid(...Object.keys(checklistGroupByCheckName))
    .required(),
  state: Joi.string().valid('true', 'false').required()
})

const emptyPayloadSchema = Joi.object({}).optional().unknown(false)

export const updateApplianceTechnicalReviewCheckByAlias = {
  method: 'PATCH',
  path: '/appliances/{id}/{checkname}/{state}',
  options: {
    auth: false,
    tags: ['api', 'appliances'],
    description:
      'Update one technical review checklist field using short URL path params',
    validate: {
      params: aliasParamsSchema,
      payload: emptyPayloadSchema
    }
  },
  handler: async (request, h) => {
    const { id, checkname, state } = request.params
    const group = checklistGroupByCheckName[checkname]

    const checklistFieldPath = `technicalReview.${group}.${checkname}`
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
