/**
 * Search appliances by name or type
 */

import Joi from 'joi'
import * as appliancesController from '../../controllers/appliances-controller.js'

export const searchAppliances = {
  method: 'GET',
  path: '/api/appliances/search',
  options: {
    validate: {
      query: Joi.object({
        q: Joi.string().min(2).required(),
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20)
      })
    }
  },
  handler: async (request, h) => {
    const { q, page, limit } = request.query

    try {
      const result = await appliancesController.searchAppliances(
        request.db,
        { query: q, page, limit },
        request.logger
      )

      return h.response(result).code(200)
    } catch (error) {
      return h
        .response({
          success: false,
          message: 'Failed to search appliances',
          error: error.message
        })
        .code(500)
    }
  }
}
