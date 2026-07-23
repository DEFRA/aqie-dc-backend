/**
 * Search fuels by name or type
 */

import Joi from 'joi'
import * as fuelsController from '../../controllers/fuels-controller.js'
import { statusCodes } from '../../common/constants/status-codes.js'

const MIN_QUERY_LENGTH = 2
const MAX_QUERY_LENGTH = 50

export const searchFuels = {
  method: 'GET',
  path: '/api/fuels/search',
  options: {
    validate: {
      query: Joi.object({
        q: Joi.string()
          .trim()
          .min(MIN_QUERY_LENGTH)
          .max(MAX_QUERY_LENGTH)
          .pattern(/^[a-zA-Z0-9\s\-_.&']+$/)
          .required()
          .description(
            'Search query for fuels (brandNames, companyName, fuelType ). Min 2, max 50 chars.'
          ),
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20)
      })
    }
  },
  handler: async (request, h) => {
    const { q, page, limit } = request.query

    try {
      const result = await fuelsController.searchFuels(
        request.db,
        { query: q, page, limit },
        request.logger
      )

      return h.response(result).code(statusCodes.ok)
    } catch (error) {
      return h
        .response({
          success: false,
          message: 'Failed to search fuels',
          error: error.message
        })
        .code(statusCodes.internalServerError)
    }
  }
}
