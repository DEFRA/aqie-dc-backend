/**
 * Get the technical review state for a fuel
 */
import Joi from 'joi'
import * as fuelReviewController from '../../controllers/fuel-review-controller.js'
import { createResultHandler } from '../../common/helpers/route-response.js'

export const getFuelReview = {
  method: 'GET',
  path: '/fuels/{fuelId}/technical-review',
  options: {
    tags: ['api', 'fuels'],
    description:
      'Fetch the technical review checks and status for the given fuel ID',
    validate: {
      params: Joi.object({
        fuelId: Joi.string().max(64).required()
      })
    }
  },
  handler: createResultHandler(
    (request) =>
      fuelReviewController.getFuelReview(
        request.db,
        request.params.fuelId,
        request.logger
      ),
    {
      logMessage: 'Failed to fetch fuel review',
      fallbackMessage: 'Failed to fetch fuel review'
    }
  )
}
