/**
 * Public finder: search and paginate live fuels
 */

import Joi from 'joi'
import * as fuelsController from '../../controllers/fuels-controller.js'
import { createResultHandler } from '../../common/helpers/route-response.js'

const MAX_QUERY_LENGTH = 50
const DEFAULT_LIMIT = 10
const MAX_LIMIT = 100

export const searchPublicFuels = {
  method: 'GET',
  path: '/fuels/search',
  options: {
    tags: ['api', 'fuels'],
    description: 'Search and paginate live fuels',
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
          .default(DEFAULT_LIMIT)
      })
    }
  },
  handler: createResultHandler(
    (request) => {
      const { q = '', ...rest } = request.query
      return fuelsController.searchFuels(
        request.db,
        { query: q, ...rest },
        request.logger
      )
    },
    {
      logMessage: 'Failed to search fuels',
      fallbackMessage: 'Failed to search fuels',
      unavailableMessage: 'Fuels search service is currently unavailable'
    }
  )
}
