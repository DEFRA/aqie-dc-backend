/**
 * Admin: get a single appliance record for the admin frontend
 */
import Boom from '@hapi/boom'
import Joi from 'joi'
import * as applianceController from '../../controllers/appliances-controller.js'
import { statusCodes } from '../../common/constants/status-codes.js'

export const getAdminApplianceById = {
  method: 'GET',
  path: '/api/admin/appliances/{id}',
  options: {
    tags: ['api', 'read', 'admin'],
    description:
      'Fetch the admin view of a single appliance: identifiers, country certification statuses and overall status',
    validate: {
      params: Joi.object({
        id: Joi.string().trim().max(100).required()
      })
    }
  },
  handler: async (request, h) => {
    const { id } = request.params

    try {
      const result = await applianceController.getAdminApplianceById(
        request.db,
        id,
        request.logger
      )

      if (result.notFound) {
        return h.response(result).code(statusCodes.notFound)
      }

      return h.response(result).code(statusCodes.ok)
    } catch (error) {
      request.logger.error(error, 'Failed to fetch admin appliance')

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
