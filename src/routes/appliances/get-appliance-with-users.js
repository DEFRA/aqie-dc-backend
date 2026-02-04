/**
 * Get appliance with all users who have it
 */

import Joi from 'joi'
import * as appliancesController from '../../controllers/appliances-controller.js'

export const getApplianceWithUsers = {
  method: 'GET',
  path: '/api/appliances/{applianceId}/users',
  options: {
    validate: {
      params: Joi.object({
        applianceId: Joi.string().required()
      })
    }
  },
  handler: async (request, h) => {
    const { applianceId } = request.params

    try {
      const result = await appliancesController.getApplianceWithUsers(
        request.db,
        applianceId,
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
          message: 'Failed to fetch appliance details',
          error: error.message
        })
        .code(500)
    }
  }
}
