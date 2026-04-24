/**
 * Get all applications with pagination
 */

import Joi from 'joi'
import * as applicationsController from '../../controllers/applications-controller.js'

export const getAllApplications = {
  method: 'GET',
  path: '/api/applications',
  options: {
    tags: ['api', 'applications'],
    description: 'Get all applications',
    notes: 'Returns a paginated list of all applications',
    validate: {
      query: Joi.object({
        page: Joi.number()
          .integer()
          .min(1)
          .default(1)
          .description('Page number'),
        limit: Joi.number()
          .integer()
          .min(1)
          .max(100)
          .default(20)
          .description('Results per page')
      })
    }
  },
  handler: async (request, h) => {
    const { page, limit } = request.query

    try {
      const result = await applicationsController.getAllApplications(
        request.db,
        { page, limit },
        request.logger
      )

      return h.response(result).code(200)
    } catch (error) {
      return h
        .response({
          success: false,
          message: 'Failed to fetch applications',
          error: error.message
        })
        .code(500)
    }
  }
}
