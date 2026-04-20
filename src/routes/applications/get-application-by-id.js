/**
 * Get application by ID
 */

import Joi from 'joi'
import * as applicationsController from '../../controllers/applications-controller.js'

export const getApplicationById = {
  method: 'GET',
  path: '/api/applications/{applicationId}',
  options: {
    tags: ['api', 'applications'],
    description: 'Get application by ID',
    notes: 'Returns a single application by its ID',
    validate: {
      params: Joi.object({
        applicationId: Joi.string().required().description('Application ID')
      })
    }
  },
  handler: async (request, h) => {
    const { applicationId } = request.params

    try {
      const result = await applicationsController.getApplicationById(
        request.db,
        applicationId,
        request.logger
      )

      if (result.notFound) {
        return h.response(result).code(404)
      }

      return h.response(result).code(200)
    } catch (error) {
      return h
        .response({
          success: false,
          message: 'Failed to fetch application',
          error: error.message
        })
        .code(500)
    }
  }
}
