/**
 * Get user with appliances and fuels
 */

import Joi from 'joi'
import * as usersController from '../../controllers/users-controller.js'

export const getUserWithRelations = {
  method: 'GET',
  path: '/api/users/{userId}/details',
  options: {
    validate: {
      params: Joi.object({
        userId: Joi.string().required()
      })
    }
  },
  handler: async (request, h) => {
    const { userId } = request.params

    try {
      const result = await usersController.getUserWithRelations(
        request.db,
        userId,
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
          message: 'Failed to fetch user details',
          error: error.message
        })
        .code(500)
    }
  }
}
