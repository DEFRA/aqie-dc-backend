/**
 * Get appliance by ID
 */
import Joi from 'joi'
import * as applianceController from '../../controllers/appliances-controller.js'
import { statusCodes } from '../../common/constants/status-codes.js'

export const getApplianceById = {
  method: 'GET',
  path: '/appliances/{applianceId}',
  options: {
    tags: ['api', 'read'],
    description: 'Fetch appliance fields for the given appliance ID',
    validate: {
      params: Joi.object({
        applianceId: Joi.string().required()
      })
    }
  },
  handler: async (request, h) => {
    const { applianceId } = request.params

    try {
      const result = await applianceController.getApplianceById(
        request.db,
        applianceId,
        request.logger
      )

      if (result.notFound) {
        return h.response(result).code(statusCodes.notFound)
      }

      return h.response(result).code(statusCodes.ok)
    } catch (error) {
      return h
        .response({
          success: false,
          message: 'Failed to fetch appliance',
          error: error.message
        })
        .code(statusCodes.internalServerError)
    }
  }
}
