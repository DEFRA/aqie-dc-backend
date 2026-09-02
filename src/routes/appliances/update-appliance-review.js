/**
 * Record the technical review decision for an appliance
 */
import Boom from '@hapi/boom'
import Joi from 'joi'
import * as applianceReviewController from '../../controllers/appliance-review-controller.js'
import { statusCodes } from '../../common/constants/status-codes.js'

const MAX_LENGTH = 255

const reviewDecisionSchema = Joi.object({
  status: Joi.string()
    .valid('in_review', 'accepted', 'rejected')
    .required()
    .description('The reviewer decision, or in_review to mark it as started'),
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
  handler: async (request, h) => {
    const { id } = request.params

    try {
      const result = await applianceReviewController.updateApplianceReview(
        request.db,
        id,
        request.payload,
        request.logger
      )

      if (result.notFound) {
        return h.response(result).code(statusCodes.notFound)
      }

      if (result.incomplete) {
        return h.response(result).code(statusCodes.conflict)
      }

      return h.response(result).code(statusCodes.ok)
    } catch (error) {
      request.logger.error(error, 'Failed to update appliance review')

      if (Boom.isBoom(error)) {
        throw error
      }

      return Boom.internal('Failed to update appliance review')
    }
  }
}
