/**
 * Get live appliances with optional search, filters and pagination.
 * Without `limit` every matching appliance is returned (no pagination block).
 */

import Joi from 'joi'
import * as applianceController from '../../controllers/appliances-controller.js'
import { createResultHandler } from '../../common/helpers/route-response.js'

const MAX_QUERY_LENGTH = 50
const MAX_LIMIT = 100

const filterList = (description) =>
  Joi.array()
    .items(Joi.string().trim().lowercase().max(50))
    .single()
    .default([])
    .description(description)

export const getAllAppliances = {
  method: 'GET',
  path: '/appliances',
  options: {
    tags: ['api', 'appliances'],
    description:
      'Get live appliances with optional search, filters and pagination',
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
      return applianceController.getAllAppliances(
        request.db,
        { query: q, ...rest },
        request.logger
      )
    },
    {
      logMessage: 'Failed to fetch appliances',
      fallbackMessage: 'Failed to fetch appliances',
      unavailableMessage: 'Appliance service is currently unavailable'
    }
  )
}
