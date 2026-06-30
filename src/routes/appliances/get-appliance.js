/**
 * Get appliance by ID
 */
//will change to -by-id after refactor
import Joi from 'joi'
import * as applianceController from '../../controllers/appliance-controller.js'
import { statusCodes } from '../../common/constants/status-codes.js'

export const getApplianceById = {
  method: 'GET',
  path: '/appliances/{applianceId}',
  options: {
    tags: ['api', 'read'],
    description: 'Fetch appliance fields for the given appliance ID',
    validate: {
      params: Joi.object({
        //type: Joi.string().valid('appliance', 'fuel').required(),
        applianceId: Joi.string().required()
      })
    }
  },
  handler: async (request, h) => {
    const { applianceId } = request.params

    try {
      const result = await applianceController.findAppliance(request.db, applianceId)
      if (!result) {
        return h
          .response({ message: 'Appliance not found' })
          .code(statusCodes.notFound)
      }

      return h.response({ msg: 'OK', data: result }).code(statusCodes.ok)
    } catch (error) {
      request.logger.error(error, 'Failed to fetch appliance')
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
