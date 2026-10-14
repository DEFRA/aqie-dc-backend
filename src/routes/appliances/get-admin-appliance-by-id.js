/**
 * Admin: get a single appliance record for the admin frontend
 */
import Joi from 'joi'
import * as applianceController from '../../controllers/appliances-controller.js'
import { createResultHandler } from '../../common/helpers/route-response.js'

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
  handler: createResultHandler(
    (request) =>
      applianceController.getAdminApplianceById(
        request.db,
        request.params.id,
        request.logger
      ),
    {
      logMessage: 'Failed to fetch admin appliance',
      fallbackMessage: 'Failed to fetch appliance',
      unavailableMessage: 'Appliance service is currently unavailable'
    }
  )
}
