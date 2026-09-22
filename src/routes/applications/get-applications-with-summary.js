/**
 * Get applications summary by status (returns only linked item names, filtered by type)
 */

import Boom from '@hapi/boom'
import Joi from 'joi'
import * as applicationsController from '../../controllers/applications-controller.js'
import { statusCodes } from '../../common/constants/status-codes.js'

export const getApplicationsWithSummary = {
  method: 'GET',
  path: '/applications/summary',
  options: {
    tags: ['api', 'applications'],
    description:
      'Get summary of (uncomplete) applications by status and type with linked item names',
    notes:
      'Returns (uncomplete) applications of the requested type ("appliance" or "fuel"), grouped by status ("new", "in_progress"), along with their linked items summary (names only)',
    validate: {
      query: Joi.object({
        type: Joi.string()
          .valid('appliance', 'fuel')
          .required()
          .description(
            'Type of applications/linked items to summarise (appliance or fuel)'
          )
      })
    }
  },
  handler: async (request, h) => {
    const { type } = request.query

    try {
      const result = await applicationsController.getApplicationsWithSummary(
        request.db,
        request.logger,
        type
      )

      if (result?.notFound) {
        return Boom.badRequest(result.message)
      }

      return h.response(result).code(statusCodes.ok)
    } catch (error) {
      request.logger.error(error, 'Failed to fetch applications summary')

      if (Boom.isBoom(error)) {
        throw error
      }

      const status = error?.status
      if (status && status >= statusCodes.internalServerError) {
        return Boom.badGateway('Application service is currently unavailable')
      }

      return Boom.internal('Failed to fetch applications summary')
    }
  }
}
