/**
 * Search appliances by name or type
 */

import Boom from '@hapi/boom'
import Joi from 'joi'
import * as applianceController from '../../controllers/appliances-controller.js'
import { statusCodes } from '../../common/constants/status-codes.js'

const MAX_QUERY_LENGTH = 50
const DEFAULT_LIMIT = 20

export const searchAppliances = {
  method: 'GET',
  path: '/api/appliances/search',
  options: {
    validate: {
      query: Joi.object({
        q: Joi.string()
          .trim()
          .allow('')
          .max(MAX_QUERY_LENGTH)
          .pattern(/^[a-zA-Z0-9\s\-_.&']*$/)
          .description(
            'Search query for appliances by modelName. Max 50 chars.'
          ),
        status: Joi.string()
          .trim()
          .allow('')
          .optional()
          .description('Comma-separated appliance statuses to filter by'),
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(DEFAULT_LIMIT)
      })
    }
  },
  handler: async (request, h) => {
    const { q = '', page, limit, status } = request.query
    const statuses =
      typeof status === 'string'
        ? status
            .split(',')
            .map((value) => value.trim().toLowerCase())
            .filter(Boolean)
        : []

    try {
      const result = await applianceController.searchAppliances(
        request.db,
        { query: q, page, limit, statuses },
        request.logger
      )

      return h.response(result).code(statusCodes.ok)
    } catch (error) {
      request.logger.error(error, 'Failed to search appliances')

      if (Boom.isBoom(error)) {
        throw error
      }

      const status = error?.status
      if (status && status >= statusCodes.internalServerError) {
        return Boom.badGateway(
          'Appliance search service is currently unavailable'
        )
      }

      return Boom.internal('Failed to search appliances')
    }
  }
}
