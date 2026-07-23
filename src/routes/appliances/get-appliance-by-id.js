/**
 * Get appliance by ID
 */
import Boom from '@hapi/boom'
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
      request.logger.error(error, 'Failed to fetch appliance')

      if (Boom.isBoom(error)) {
        throw error
      }

      const status = error?.status
      if (status && status >= statusCodes.internalServerError) {
        return Boom.badGateway('Appliance service is currently unavailable')
      }

      return Boom.internal('Failed to fetch appliance')
    }
  }
}
