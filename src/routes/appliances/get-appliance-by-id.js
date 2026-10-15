/**
 * Get appliance by ID
 */
import Joi from 'joi'
import * as applianceController from '../../controllers/appliances-controller.js'
import { createResultHandler } from '../../common/helpers/route-response.js'

export const getApplianceById = {
  method: 'GET',
  path: '/appliances/{id}',
  options: {
    tags: ['api', 'read'],
    description: 'Fetch appliance fields for the given appliance ID',
    validate: {
      params: Joi.object({
        id: Joi.string().required()
      })
    }
  },
  handler: createResultHandler(
    (request) =>
      applianceController.getApplianceById(
        request.db,
        request.params.id,
        request.logger
      ),
    {
      logMessage: 'Failed to fetch appliance',
      fallbackMessage: 'Failed to fetch appliance',
      unavailableMessage: 'Appliance service is currently unavailable'
    }
  )
}
