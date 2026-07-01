/**
 * Delete appliance
 */

import Joi from 'joi'
import * as applianceController from '../../controllers/appliance-controller.js'
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
      const { notFound } = await applianceController.deleteAppliance(
        request.db,
        applianceId,
        request.logger
      )
      if (notFound)
        return h.response({ msg: 'Not found' }).code(statusCodes.notFound)
      return h.response({ msg: 'Deleted', applianceId }).code(statusCodes.ok)
    } catch (err) {
      request.logger.error(err, 'Failed to delete appliance')
      return h
        .response({ msg: 'Failed to delete appliance' })
        .code(statusCodes.internalServerError)
    }
  }
}
