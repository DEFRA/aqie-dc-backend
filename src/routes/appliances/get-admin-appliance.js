/**
 * Get certification state for an appliance
 */
import Boom from '@hapi/boom'
import Joi from 'joi'
import * as applianceController from '../../controllers/appliances-controller.js'
import { statusCodes } from '../../common/constants/status-codes.js'

export const getAdminRecords = {
  method: 'GET',
  path: '/admin-appliances/{id}',
  options: {
    tags: ['api', 'read'],
    description:
      'Fetch the model name, per-country certification and overall status for the given appliance ID',
    validate: {
      params: Joi.object({
        id: Joi.string().max(64).required()
      })
    }
  },
  handler: async (request, h) => {
    const { id } = request.params

    try {
      const result = await applianceController.getAdminRecords(
        request.db,
        id,
        request.logger
      )

      if (result.notFound) {
        return h.response(result).code(statusCodes.notFound)
      }

      return h.response(result).code(statusCodes.ok)
    } catch (error) {
      request.logger.error(error, 'Failed to fetch appliance certification')

      if (Boom.isBoom(error)) {
        throw error
      }

      return Boom.internal('Failed to fetch appliance certification')
    }
  }
}
