/**
 * Delete appliance
 */

import Joi from 'joi'
import * as applianceController from '../../controllers/appliances-controller.js'
import { statusCodes } from '../../common/constants/status-codes.js'

export const deleteAppliance = {
  method: 'DELETE',
  path: '/appliances/{applianceId}',
  options: {
    tags: ['api', 'appliances'],
    description: 'Delete appliance by ID',
    validate: {
      params: Joi.object({
        applianceId: Joi.string().required()
      })
    }
  },
  handler: async (request, h) => {
    const { applianceId } = request.params

    try {
      const result = await applianceController.deleteAppliance(
        request.db,
        applianceId,
        request.logger
      )
      
      if (result.notFound) {
        return h.response(result).code(statusCodes.notFound)
      }

      return h.response(result).code(statusCodes.ok)
    } catch (err) {
      return h
        .response({
          success: false,
          message: 'Failed to delete appliance',
          error: err.message
        })
        .code(statusCodes.internalServerError)
    }
  }
}
