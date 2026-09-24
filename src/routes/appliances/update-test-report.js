import Boom from '@hapi/boom'
import Joi from 'joi'
import * as applianceReviewController from '../../controllers/appliance-review-controller.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import { testReportPayloadSchema } from './test-report-schema.js'

export const updateTestReport = {
  method: 'PATCH',
  path: '/appliances/{id}/test-reports',
  options: {
    tags: ['api', 'appliances'],
    description: 'Update test-report values and review status for an appliance',
    validate: {
      params: Joi.object({
        id: Joi.string().max(64).required()
      }),
      payload: testReportPayloadSchema
    }
  },

  handler: async (request, h) => {
    const { id } = request.params

    try {
      const outcome = await applianceReviewController.updateTestReport(
        request.db,
        id,
        request.payload,
        request.logger
      )

      if (outcome.notFound) {
        return h.response(outcome).code(statusCodes.notFound)
      }

      return h.response(outcome).code(statusCodes.ok)
    } catch (error) {
      request.logger.error(error, 'Failed to update appliance test reports')

      if (Boom.isBoom(error)) {
        throw error
      }

      return Boom.internal('Failed to update appliance test reports')
    }
  }
}
