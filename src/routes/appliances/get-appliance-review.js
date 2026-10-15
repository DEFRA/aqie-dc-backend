/**
 * Get the technical review state for an appliance
 */
import Joi from 'joi'
import * as applianceReviewController from '../../controllers/appliance-review-controller.js'
import { createResultHandler } from '../../common/helpers/route-response.js'

export const getApplianceReview = {
  method: 'GET',
  path: '/appliances/{id}/technical-review',
  options: {
    tags: ['api', 'read'],
    description:
      'Fetch the technical review checks and status for the given appliance ID',
    validate: {
      params: Joi.object({
        id: Joi.string().max(64).required()
      })
    }
  },
  handler: createResultHandler(
    (request) =>
      applianceReviewController.getApplianceReview(
        request.db,
        request.params.id,
        request.logger
      ),
    {
      logMessage: 'Failed to fetch appliance review',
      fallbackMessage: 'Failed to fetch appliance review'
    }
  )
}
