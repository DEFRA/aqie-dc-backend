/**
 * Search applications by status or reviewer
 */

import Joi from 'joi'
import * as applicationsController from '../../controllers/applications-controller.js'

export const searchApplications = {
  method: 'GET',
  path: '/api/applications/search',
  options: {
    tags: ['api', 'applications'],
    description: 'Search applications',
    notes: 'Search applications by status or reviewer',
    validate: {
      query: Joi.object({
        q: Joi.string().min(2).required().description('Search query'),
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
    const { q, page, limit } = request.query

    try {
      const result = await applicationsController.searchApplications(
        request.db,
        { query: q, page, limit },
        request.logger
      )

      return h.response(result).code(200)
    } catch (error) {
      return h
        .response({
          success: false,
          message: 'Failed to search applications',
          error: error.message
        })
        .code(500)
    }
  }
}
