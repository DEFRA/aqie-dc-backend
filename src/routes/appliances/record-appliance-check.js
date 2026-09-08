/**
 * Record the result of one technical review check
 */
import Boom from '@hapi/boom'
import Joi from 'joi'
import * as applianceReviewController from '../../controllers/appliance-review-controller.js'
import { ALL_CHECKS } from '../../common/helpers/review-status.js'
import { statusCodes } from '../../common/constants/status-codes.js'

export const recordApplianceCheck = {
  method: 'PATCH',
  path: '/appliances/{id}/technical-review/checks',
  options: {
    tags: ['api', 'appliances'],
    description: 'Record the result of a single documentation or listing check',
    validate: {
      params: Joi.object({
        id: Joi.string().max(64).required()
      }),
      payload: Joi.object({
        check: Joi.string()
          .valid(...ALL_CHECKS)
          .required()
          .description('Which check the result applies to'),
        result: Joi.boolean()
          .allow(null)
          .required()
          .description('true passed, false failed, null not reviewed')
      }).unknown(false)
    }
  },
  handler: async (request, h) => {
    const { id } = request.params
    const { check, result } = request.payload

    try {
      const outcome = await applianceReviewController.recordApplianceCheck(
        request.db,
        id,
        check,
        result,
        request.logger
      )
      if (outcome.notFound) {
        return h.response(outcome).code(statusCodes.notFound)
      }

      return h.response(outcome).code(statusCodes.ok)
    } catch (error) {
      request.logger.error(error, 'Failed to record appliance check')

      if (Boom.isBoom(error)) {
        throw error
      }

      return Boom.internal('Failed to record appliance check')
    }
  }
}
