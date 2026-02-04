/**
 * Get user by ID
 */

import Joi from 'joi'
import * as usersController from '../../controllers/users-controller.js'

export const getUserById = {
  method: 'GET',
  path: '/api/users/{userId}',
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
      const result = await usersController.getUserById(
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
          message: 'Failed to fetch user',
          error: error.message
        })
        .code(500)
    }
  }
}
