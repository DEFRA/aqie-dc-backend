/**
 * Get all appliances with pagination
 */

import Joi from 'joi'
import * as appliancesController from '../../controllers/appliances-controller.js'

export const getAllAppliances = {
  method: 'GET',
  path: '/api/appliances',
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
      const result = await appliancesController.getAllAppliances(
        request.db,
        { page, limit },
        request.logger
      )

      return h.response(result).code(200)
    } catch (error) {
      return h
        .response({
          success: false,
          message: 'Failed to fetch appliances',
          error: error.message
        })
        .code(500)
    }
  }
}
