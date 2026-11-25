/**
 * Admin: get a single fuel record for the admin frontend
 */
import Joi from 'joi'
import * as fuelController from '../../controllers/fuels-controller.js'
import { createResultHandler } from '../../common/helpers/route-response.js'

export const getAdminFuelById = {
  method: 'GET',
  path: '/admin/fuels/{id}',
  options: {
    tags: ['api', 'read', 'admin'],
    description:
      'Fetch the admin view of a single fuel: identifiers, supplier type, country certification statuses and overall status',
    validate: {
      params: Joi.object({
        id: Joi.string().trim().max(100).required()
      })
    }
  },
  handler: createResultHandler(
    (request) =>
      fuelController.getAdminFuelById(
        request.db,
        request.params.id,
        request.logger
      ),
    {
      logMessage: 'Failed to fetch admin fuel',
      fallbackMessage: 'Failed to fetch fuel',
      unavailableMessage: 'Fuel service is currently unavailable'
    }
  )
}
