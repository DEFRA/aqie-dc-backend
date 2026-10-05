/**
 * Route: GET /appliance-types
 * Get all available appliance types, optionally filtered by isPrimary
 */
import Boom from '@hapi/boom'
import Joi from 'joi'
import { statusCodes } from '../../common/constants/status-codes.js'
import * as applianceTypesController from '../../controllers/appliance-types-controller.js'

export const getApplianceTypes = {
  method: 'GET',
  path: '/appliance-types',
  options: {
    tags: ['api', 'read'],
    description:
      'Fetch available appliance types, optionally filtered by isPrimary',
    validate: {
      query: Joi.object({
        isPrimary: Joi.boolean().required()
      })
    }
  },
  handler: async (request, h) => {
    try {
      const { isPrimary } = request.query

      const result = await applianceTypesController.getApplianceTypes(
        request.db,
        { isPrimary },
        request.logger
      )

      return h.response(result.data).code(statusCodes.ok)
    } catch (error) {
      request.logger.error(error, 'Failed to fetch appliance types')

      if (Boom.isBoom(error)) {
        throw error
      }

      return Boom.internal('Failed to fetch appliance types')
    }
  }
}
