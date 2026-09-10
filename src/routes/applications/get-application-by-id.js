/**
 * Get application by ID
 * /applications/12345?groupBy=techReviewStatus
 * groupBy=techReviewStatus - Reshape `appliances` as { pending, accepted, rejected } instead of a flat appliances array.
 */

import Joi from 'joi'
import Boom from '@hapi/boom'
import * as applicationsController from '../../controllers/applications-controller.js'
import { statusCodes } from '../../common/constants/status-codes.js'

export const getApplicationById = {
  method: 'GET',
  path: '/applications/{applicationId}',
  options: {
    tags: ['api', 'applications'],
    description: 'Get application by ID',
    notes: 'Returns a single application by its ID',
    validate: {
      params: Joi.object({
        applicationId: Joi.string().required().description('Application ID')
      }),
      query: Joi.object({
        groupBy: Joi.string()
          .valid('techReviewStatus')
          .optional()
          .description(
            'Optionally group linked items by technical review status'
          )
      })
    }
  },
  handler: async (request, h) => {
    const { applicationId } = request.params
    const { groupBy } = request.query

    try {
      const result = await applicationsController.getApplicationById(
        request.db,
        applicationId,
        request.logger,
        groupBy
      )

      if (result.notFound) {
        return h.response(result).code(statusCodes.notFound)
      }

      return h.response(result).code(statusCodes.ok)
    } catch (error) {
      request.logger.error(error, 'Failed to fetch application')

      if (Boom.isBoom(error)) {
        throw error
      }

      const status = error?.status
      if (status && status >= statusCodes.internalServerError) {
        return Boom.badGateway('Application service is currently unavailable')
      }

      return Boom.internal('Failed to fetch application')
    }
  }
}
