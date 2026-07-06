/**
 * Get all fuels
 * TODO: DECISION REQUIRED - Should pagination be enabled for this endpoint?
 * Currently returns all certified fuels. Pagination can be enabled by:
 * 1. Uncomment the validate block with page/limit query params
 * 2. Uncomment page/limit destructuring in handler
 * 3. Change getAllFuels to getAllFuelsWithPagination
 * 4. Pass { page, limit } to controller instead of hard-coded values
 */

import Joi from 'joi'
import * as fuelController from '../../controllers/fuels-controller.js'
import { statusCodes } from '../../common/constants/status-codes.js'

export const getAllFuels = {
  method: 'GET',
  path: '/fuels',
  options: {
    tags: ['api', 'fuels'],
    description: 'Get all fuels',
    notes: 'Returns all certified fuels'
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
      const result = await fuelController.getAllFuels(
        request.db,
        request.logger
      )
      return h.response(result).code(statusCodes.ok)
    } catch (err) {
      return h
        .response({
          success: false,
          message: 'Failed to fetch fuels',
          error: err.message
        })
        .code(statusCodes.internalServerError)
    }
  }
}
