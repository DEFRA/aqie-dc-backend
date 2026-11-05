/**
 * Record the technical review decision for a fuel
 */
import Joi from 'joi'
import * as fuelReviewController from '../../controllers/fuel-review-controller.js'
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

export const updateFuelReview = {
  method: 'PATCH',
  path: '/fuels/{fuelId}/technical-review',
  options: {
    tags: ['api', 'fuels'],
    description: 'Accept or reject a fuel after technical review',
    validate: {
      params: Joi.object({
        fuelId: Joi.string().max(64).required()
      }),
      payload: reviewDecisionSchema
    }
  },
  handler: createResultHandler(
    (request) =>
      fuelReviewController.updateFuelReview(
        request.db,
        request.params.fuelId,
        request.payload,
        request.logger
      ),
    {
      logMessage: 'Failed to update fuel review',
      fallbackMessage: 'Failed to update fuel review'
    }
  )
}
