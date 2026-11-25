/**
 * Get live fuels with optional search and pagination.
 * Without `limit` every matching fuel is returned (no pagination block).
 */

import Joi from 'joi'
import * as fuelsController from '../../controllers/fuels-controller.js'
import { createResultHandler } from '../../common/helpers/route-response.js'

const MAX_QUERY_LENGTH = 50
const MAX_LIMIT = 100

export const getAllFuels = {
  method: 'GET',
  path: '/fuels',
  options: {
    tags: ['api', 'fuels'],
    description: 'Get live fuels with optional search and pagination',
    validate: {
      query: Joi.object({
        q: Joi.string()
          .trim()
          .allow('')
          .max(MAX_QUERY_LENGTH)
          .pattern(/^[a-zA-Z0-9\s\-_.,&']*$/)
          .description(
            'Comma-separated search terms matched against brandName, additionalBrandNames, or companyName. Max 50 chars.'
          ),
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number()
          .integer()
          .min(1)
          .max(MAX_LIMIT)
          .description('Results per page; omit to return all')
      })
    }
  },
  handler: createResultHandler(
    (request) => {
      const { q = '', ...rest } = request.query
      return fuelsController.getAllFuels(
        request.db,
        { query: q, ...rest },
        request.logger
      )
    },
    {
      logMessage: 'Failed to fetch fuels',
      fallbackMessage: 'Failed to fetch fuels',
      unavailableMessage: 'Fuels service is currently unavailable'
    }
  )
}
