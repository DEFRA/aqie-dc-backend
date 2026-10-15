/**
 * Delete appliance
 */

import Joi from 'joi'
import * as applianceController from '../../controllers/appliances-controller.js'
import { createResultHandler } from '../../common/helpers/route-response.js'

export const deleteAppliance = {
  method: 'DELETE',
  path: '/appliances/{id}',
  options: {
    tags: ['api', 'appliances'],
    description: 'Delete appliance by ID',
    validate: {
      params: Joi.object({
        id: Joi.string().required()
      })
    }
  },
  handler: createResultHandler(
    (request) =>
      applianceController.deleteAppliance(
        request.db,
        request.params.id,
        request.logger
      ),
    {
      logMessage: 'Failed to delete appliance',
      fallbackMessage: 'Failed to delete appliance'
    }
  )
}
