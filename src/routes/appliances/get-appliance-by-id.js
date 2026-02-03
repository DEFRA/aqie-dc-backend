/**
 * Get appliance by ID
 */

import Joi from 'joi'
import * as appliancesController from '../../controllers/appliances-controller.js'

export const getApplianceById = {
  method: 'GET',
  path: '/api/appliances/{applianceId}',
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
      const result = await appliancesController.getApplianceById(
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
          message: 'Failed to fetch appliance',
          error: error.message
        })
        .code(500)
    }
  }
}
