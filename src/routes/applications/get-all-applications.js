/**
 * Get all applications
 * TODO: DECISION REQUIRED - Should pagination be enabled for this endpoint?
 * Pagination query params are currently disabled but can be re-enabled if needed
 */

import * as applicationsController from '../../controllers/applications-controller.js'
import { statusCodes } from '../../common/constants/status-codes.js'

export const getAllApplications = {
  method: 'GET',
  path: '/applications',
  options: {
    tags: ['api', 'applications'],
    description: 'Get all applications',
    notes: 'Returns all applications'
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
      // const result = await applicationsController.getAllApplications(
      //   request.db,
      //   { page, limit },
      //   request.logger
      // )
      // For now, pass default pagination values
      const result = await applicationsController.getAllApplications(
        request.db,
        { page: 1, limit: 999999 }, // Return all applications
        request.logger
      )

      return h.response(result).code(statusCodes.ok)
    } catch (error) {
      return h
        .response({
          success: false,
          message: 'Failed to fetch applications',
          error: error.message
        })
        .code(statusCodes.internalServerError)
    }
  }
}
