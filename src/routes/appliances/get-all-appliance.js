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

import * as applianceController from '../../controllers/appliance-controller.js'
import { statusCodes } from '../../common/constants/status-codes.js'

export const getAllAppliances = {
  method: 'GET',
  path: '/appliances',
  options: {
    tags: ['api', 'appliances'],
    description: 'Get all appliances',
    notes: 'Returns all certified appliances',
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
  handler: async (request, h) => {
    // TODO: PAGINATION - Uncomment when pagination is re-enabled
    // const { page, limit } = request.query

    try {
      // TODO: PAGINATION - Pass pagination params when re-enabled:
      // const result = await applianceController.getAllAppliances(
      //   request.db,
      //   { page, limit },
      //   request.logger
      // )
      // For now, pass default pagination values to return all appliances
      const result = await applianceController.getAllAppliances(
        request.db,
        { page: 1, limit: 999999 }, // Return all certified appliances
        request.logger
      )
      return h.response(result).code(statusCodes.ok)
    } catch (error) {
      request.logger.error(error, 'Failed to fetch appliances')
      return h
        .response({
          success: false,
          message: 'Failed to fetch appliances',
          error: error.message
        })
        .code(statusCodes.internalServerError)
    }
  }
}
