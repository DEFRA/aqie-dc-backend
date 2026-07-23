/**
 * Search applications by status or reviewer
 */

import Joi from 'joi'
import * as applicationsController from '../../controllers/applications-controller.js'
import { statusCodes } from '../../common/constants/status-codes.js'

const MIN_QUERY_LENGTH = 2
const MAX_QUERY_LENGTH = 50

export const searchApplications = {
  method: 'GET',
  path: '/applications/search',
  options: {
    tags: ['api', 'applications'],
    description: 'Search applications',
    notes: 'Search applications by status or reviewer',
    validate: {
      query: Joi.object({
        q: Joi.string()
          .trim()
          .min(MIN_QUERY_LENGTH)
          .max(MAX_QUERY_LENGTH)
          .pattern(/^[a-zA-Z0-9\s\-_.&']+$/)
          .required()
          .description(
            'Search query for applications (status, reviewer, applicationId). Min 2, max 50 chars.'
          ),
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

      return h.response(result).code(statusCodes.ok)
    } catch (error) {
      return h
        .response({
          success: false,
          message: 'Failed to search applications',
          error: error.message
        })
        .code(statusCodes.internalServerError)
    }
  }
}
