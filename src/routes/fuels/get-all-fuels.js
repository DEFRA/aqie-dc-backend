/**
 * Get all fuels with pagination
 */

import Joi from 'joi'
import * as fuelsController from '../../controllers/fuels-controller.js'

export const getAllFuels = {
  method: 'GET',
  path: '/api/fuels',
  options: {
    validate: {
      query: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20)
      })
    }
  },
  handler: async (request, h) => {
    const { page, limit } = request.query

    try {
      const result = await fuelsController.getAllFuels(
        request.db,
        { page, limit },
        request.logger
      )

      return h.response(result).code(200)
    } catch (error) {
      return h
        .response({
          success: false,
          message: 'Failed to fetch fuels',
          error: error.message
        })
        .code(500)
    }
  }
}
