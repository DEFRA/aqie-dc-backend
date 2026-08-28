/**
 * Get application summary by ID (returns appliance names and technical review status)
 */

import Boom from '@hapi/boom'
import Joi from 'joi'
import * as applicationsController from '../../controllers/applications-controller.js'
import { statusCodes } from '../../common/constants/status-codes.js'

export const getApplicationSummary = {
  method: 'GET',
  path: '/applications/{applicationId}/summary',
  options: {
    tags: ['api', 'applications'],
    description:
      'Get summary of a particular application by application ID with appliance or fuel names and technical review status',
    validate: {
      params: Joi.object({
        applicationId: Joi.string()
          .required()
          .description('The ID of the application')
      }),
      query: Joi.object({
        type: Joi.string()
          .valid('appliance', 'fuel')
          .required()
          .description(
            'Type of associated items to retrieve (appliance or fuel)'
          )
      })
    }
  },
  handler: async (request, h) => {
    const { applicationId } = request.params
    const { type } = request.query

    try {
      const result = await applicationsController.getApplicationSummaryById(
        request.db,
        applicationId,
        type,
        request.logger
      )

      if (result?.notFound) {
        return Boom.notFound(result.message)
      }

      return h.response(result).code(statusCodes.ok)
    } catch (error) {
      request.logger.error(error, 'Failed to fetch application summary')

      if (Boom.isBoom(error)) {
        throw error
      }

      const status = error?.status
      if (status && status >= statusCodes.internalServerError) {
        return Boom.badGateway('Application service is currently unavailable')
      }

      return Boom.internal('Failed to fetch application summary')
    }
  }
}
