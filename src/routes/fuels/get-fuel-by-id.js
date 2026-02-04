/**
 * Get fuel by ID
 */

import Joi from 'joi'
import * as fuelsController from '../../controllers/fuels-controller.js'

export const getFuelById = {
  method: 'GET',
  path: '/api/fuels/{fuelId}',
  options: {
    validate: {
      params: Joi.object({
        fuelId: Joi.string().required()
      })
    }
  },
  handler: async (request, h) => {
    const { fuelId } = request.params

    try {
      const result = await fuelsController.getFuelById(
        request.db,
        fuelId,
        request.logger
      )

      if (result.notFound) {
        return h.response(result).code(404)
      }

      return h.response(result).code(200)
    } catch (error) {
      return h
        .response({
          success: false,
          message: 'Failed to fetch fuel',
          error: error.message
        })
        .code(500)
    }
  }
}
