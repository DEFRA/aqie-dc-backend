/**
 * Get all appliances
 * TODO: DECISION REQUIRED - Should pagination be enabled for this endpoint?
 * Currently returns all certified appliances. Pagination can be enabled by:
 * 1. Uncomment the validate block with page/limit query params
 * 2. Uncomment page/limit destructuring in handler
 * 3. Pass { page, limit } to controller instead of hard-coded values
 * 4. Uncomment pagination filtering in controller
 * 5. Include pagination metadata in response
 */

import * as applianceController from '../../controllers/appliances-controller.js'
import { createResultHandler } from '../../common/helpers/route-response.js'

export const getAllAppliances = {
  method: 'GET',
  path: '/appliances',
  options: {
    tags: ['api', 'appliances'],
    description: 'Get all appliances',
    notes: 'Returns all certified appliances'
    // TODO: PAGINATION - Uncomment validation below if pagination is re-enabled
    // validate: {
    //   query: Joi.object({
    //     page: Joi.number()
    //       .integer()
    //       .min(1)
    //       .default(1)
    //       .description('Page number'),
    //     limit: Joi.number()
    //       .integer()
    //       .min(1)
    //       .max(100)
    //       .default(20)
    //       .description('Results per page')
    //   })
    // }
  },
  // TODO: PAGINATION - Pass { page, limit } from request.query when re-enabled
  handler: createResultHandler(
    (request) =>
      applianceController.getAllAppliances(
        request.db,
        { page: 1, limit: 999999 }, // Return all certified appliances
        request.logger
      ),
    {
      logMessage: 'Failed to fetch appliances',
      fallbackMessage: 'Failed to fetch appliances',
      unavailableMessage: 'Appliance service is currently unavailable'
    }
  )
}
