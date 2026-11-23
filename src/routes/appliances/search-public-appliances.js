/**
 * Public finder: search, filter and paginate live appliances
 */

import Joi from 'joi'
import * as applianceController from '../../controllers/appliances-controller.js'
import { createResultHandler } from '../../common/helpers/route-response.js'

const MAX_QUERY_LENGTH = 50
const DEFAULT_LIMIT = 10
const MAX_LIMIT = 100

const filterList = (description) =>
  Joi.array()
    .items(Joi.string().trim().lowercase().max(50))
    .single()
    .default([])
    .description(description)

export const searchPublicAppliances = {
  method: 'GET',
  path: '/appliances/search',
  options: {
    tags: ['api', 'appliances'],
    description: 'Search and filter live appliances with pagination',
    validate: {
      query: Joi.object({
        q: Joi.string()
          .trim()
          .allow('')
          .max(MAX_QUERY_LENGTH)
          .pattern(/^[a-zA-Z0-9\s\-_.,&']*$/)
          .description(
            'Comma-separated search terms matched against modelName, companyName, modelNumber or applianceType. Max 50 chars.'
          ),
        certifiedIn: filterList('Countries the appliance is certified in'),
        fuelsAllowed: filterList('Permitted fuels'),
        applianceType: filterList('Appliance types'),
        includeFilterOptions: Joi.boolean()
          .default(false)
          .description(
            'Include per-option counts for the filters, scoped to the current search and other selected filters'
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
      return applianceController.searchPublicAppliances(
        request.db,
        { query: q, ...rest },
        request.logger
      )
    },
    {
      logMessage: 'Failed to search appliances',
      fallbackMessage: 'Failed to search appliances',
      unavailableMessage: 'Appliance search service is currently unavailable'
    }
  )
}
