import Boom from '@hapi/boom'
import Joi from 'joi'
import * as applianceReviewController from '../../controllers/appliance-review-controller.js'
import { statusCodes } from '../../common/constants/status-codes.js'

export const getTestReport = {
  method: 'GET',
  path: '/appliances/{id}/test-reports',
  options: {
    tags: ['api', 'appliances'],
    description: 'Get test-report values and review status for an appliance',
    validate: {
      params: Joi.object({
        id: Joi.string().max(64).required()
      })
    }
  },

  handler: async (request, h) => {
    const { id } = request.params

    try {
      const outcome = await applianceReviewController.getTestReport(
        request.db,
        id,
        request.logger
      )

      if (outcome.notFound) {
        return h.response(outcome).code(statusCodes.notFound)
      }

      return h.response(outcome).code(statusCodes.ok)
    } catch (error) {
      request.logger.error(error, 'Failed to get appliance test reports')

      if (Boom.isBoom(error)) {
        throw error
      }

      return Boom.internal('Failed to get appliance test reports')
    }
  }
}
