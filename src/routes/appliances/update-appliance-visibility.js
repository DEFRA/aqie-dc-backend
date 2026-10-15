/**
 * Show or hide an appliance from the public and recalculate its status
 */
import Boom from '@hapi/boom'
import Joi from 'joi'
import * as applianceController from '../../controllers/appliances-controller.js'
import { statusCodes } from '../../common/constants/status-codes.js'

export const updateApplianceVisibility = {
  method: 'PATCH',
  path: '/appliances/{id}/visibility',
  options: {
    tags: ['api', 'appliances'],
    description:
      'Set whether an appliance is visible to the public and recalculate its applianceStatus',
    validate: {
      params: Joi.object({
        id: Joi.string().max(64).required()
      }),
      payload: Joi.object({
        isVisibleToPublic: Joi.boolean().strict().required()
      }).unknown(false)
    }
  },
  handler: async (request, h) => {
    const { id } = request.params

    try {
      const result = await applianceController.updateApplianceVisibility(
        request.db,
        id,
        request.payload.isVisibleToPublic,
        request.logger
      )

      if (result.notFound) {
        return h.response(result).code(statusCodes.notFound)
      }

      if (result.incomplete) {
        return h.response(result).code(statusCodes.conflict)
      }

      return h.response(result).code(statusCodes.ok)
    } catch (error) {
      request.logger.error(error, 'Failed to update appliance visibility')

      if (Boom.isBoom(error)) {
        throw error
      }

      return Boom.internal('Failed to update appliance visibility')
    }
  }
}
