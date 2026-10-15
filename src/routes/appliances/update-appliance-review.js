/**
 * Record the technical review decision for an appliance
 */
import Joi from 'joi'
import * as applianceReviewController from '../../controllers/appliance-review-controller.js'
import { createResultHandler } from '../../common/helpers/route-response.js'

const MAX_LENGTH = 255

const reviewDecisionSchema = Joi.object({
  status: Joi.string()
    .valid('accepted', 'rejected')
    .required()
    .description('The reviewer decision'),
  reviewedBy: Joi.object({
    name: Joi.string().max(MAX_LENGTH).required(),
    email: Joi.string().email().max(MAX_LENGTH).required()
  })
    .optional()
    .description(
      'The signed-in reviewer, supplied by the admin frontend from its session'
    )
}).unknown(false)

export const updateApplianceReview = {
  method: 'PATCH',
  path: '/appliances/{id}/technical-review',
  options: {
    tags: ['api', 'appliances'],
    description: 'Accept or reject an appliance after technical review',
    validate: {
      params: Joi.object({
        id: Joi.string().max(64).required()
      }),
      payload: reviewDecisionSchema
    }
  },
  handler: createResultHandler(
    (request) =>
      applianceReviewController.updateApplianceReview(
        request.db,
        request.params.id,
        request.payload,
        request.logger
      ),
    {
      logMessage: 'Failed to update appliance review',
      fallbackMessage: 'Failed to update appliance review'
    }
  )
}
