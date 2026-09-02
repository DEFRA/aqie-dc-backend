/**
 * Get the technical review state for an appliance
 */
import Boom from '@hapi/boom'
import Joi from 'joi'
import * as applianceReviewController from '../../controllers/appliance-review-controller.js'
import { statusCodes } from '../../common/constants/status-codes.js'

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
  handler: async (request, h) => {
    const { id } = request.params

    try {
      const result = await applianceReviewController.getApplianceReview(
        request.db,
        id,
        request.logger
      )

      if (result.notFound) {
        return h.response(result).code(statusCodes.notFound)
      }

      return h.response(result).code(statusCodes.ok)
    } catch (error) {
      request.logger.error(error, 'Failed to fetch appliance review')

      if (Boom.isBoom(error)) {
        throw error
      }

      return Boom.internal('Failed to fetch appliance review')
    }
  }
}
