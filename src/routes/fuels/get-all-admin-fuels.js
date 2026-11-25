/**
 * Admin: list and search fuels by brand name or ID
 */

import Joi from 'joi'
import * as fuelController from '../../controllers/fuels-controller.js'
import { createResultHandler } from '../../common/helpers/route-response.js'

const MAX_QUERY_LENGTH = 50
const DEFAULT_LIMIT = 20

const parseStatuses = (value) =>
  typeof value === 'string'
    ? value
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    : value || []

const adminFuelsQuerySchema = Joi.object({
  q: Joi.string()
    .trim()
    .allow('')
    .max(MAX_QUERY_LENGTH)
    .pattern(/^[a-zA-Z0-9\s\-_.&']*$/)
    .description(
      'Search query for fuels by brandName, additionalBrandNames, or id. Max 50 chars.'
    ),
  status: Joi.string()
    .trim()
    .allow('')
    .custom(parseStatuses)
    .default(() => [])
    .description('Comma-separated fuel statuses to filter by'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(DEFAULT_LIMIT)
})

export const getAdminFuels = {
  method: 'GET',
  path: '/admin/fuels',
  options: {
    validate: {
      query: adminFuelsQuerySchema
    }
  },
  handler: createResultHandler(
    ({ db, logger, query: { q = '', page, limit, status } }) =>
      fuelController.getAdminFuels(
        db,
        { query: q, page, limit, statuses: parseStatuses(status) },
        logger
      ),
    {
      logMessage: 'Failed to fetch admin fuels',
      fallbackMessage: 'Failed to fetch fuels',
      unavailableMessage: 'Fuel service is currently unavailable'
    }
  )
}
