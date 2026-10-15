/**
 * Search appliances by model name, company, model number, or type
 */

import Joi from 'joi'
import * as applianceController from '../../controllers/appliances-controller.js'
import { createResultHandler } from '../../common/helpers/route-response.js'

const MAX_QUERY_LENGTH = 50
const DEFAULT_LIMIT = 20

export const searchAdminAppliances = {
  method: 'GET',
  path: '/api/admin/appliances/search',
  options: {
    validate: {
      query: Joi.object({
        q: Joi.string()
          .trim()
          .allow('')
          .max(MAX_QUERY_LENGTH)
          .pattern(/^[a-zA-Z0-9\s\-_.&']*$/)
          .description(
            'Search query for appliances by modelName, companyName, modelNumber, or applianceType. Max 50 chars.'
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
  handler: createResultHandler(
    (request) => {
      const { q = '', page, limit, status } = request.query
      const statuses =
        typeof status === 'string'
          ? status
              .split(',')
              .map((value) => value.trim().toLowerCase())
              .filter(Boolean)
          : []

      return applianceController.searchAdminAppliances(
        request.db,
        { query: q, page, limit, statuses },
        request.logger
      )
    },
    {
      logMessage: 'Failed to search admin appliances',
      fallbackMessage: 'Failed to search appliances',
      unavailableMessage: 'Appliance search service is currently unavailable'
    }
  )
}
