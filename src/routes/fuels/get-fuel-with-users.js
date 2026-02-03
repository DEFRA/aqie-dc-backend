/**
 * Get fuel with all users who use it
 */

import Joi from 'joi'
import * as fuelsController from '../../controllers/fuels-controller.js'

export const getFuelWithUsers = {
  method: 'GET',
  path: '/api/fuels/{fuelId}/users',
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
      const result = await fuelsController.getFuelWithUsers(
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
          message: 'Failed to fetch fuel details',
          error: error.message
        })
        .code(500)
    }
  }
}
