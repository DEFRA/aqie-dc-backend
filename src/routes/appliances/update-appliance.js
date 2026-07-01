/**
 * Update appliance
 */

import Joi from 'joi'
import * as applianceController from '../../controllers/appliance-controller.js'
import { applianceSchema } from '../schema.js'
import { statusCodes } from '../../common/constants/status-codes.js'

export const updateAppliance = {
  method: 'PATCH',
  path: '/appliances/{applianceId}',
  options: {
    tags: ['api', 'appliances'],
    description: 'Update appliance fields',
    validate: {
      params: Joi.object({
        applianceId: Joi.string().required()
      }),
      payload: Joi.object().unknown(true)
    }
  },
  handler: async (request, h) => {
    const { applianceId } = request.params

    try {
      const { notFound, updated } = await applianceController.updateAppliance(
        request.db,
        applianceId,
        request.payload
      )
      if (notFound) return h.response({ msg: 'Not found' }).code(statusCodes.notFound)
      return h.response({ msg: 'Updated', data: updated }).code(statusCodes.ok)
    } catch (err) {
      request.logger.error(err, 'Failed to update appliance')
      return h.response({ msg: 'Failed to update appliance' }).code(statusCodes.internalServerError)
    }
  }
}
