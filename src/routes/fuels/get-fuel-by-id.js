/**
 * Get fuel by ID
 */
import Joi from 'joi'
import * as fuelController from '../../controllers/fuels-controller.js'
import { statusCodes } from '../../common/constants/status-codes.js'

export const getFuelById = {
  method: 'GET',
  path: '/fuels/{fuelId}',
  options: {
    tags: ['api', 'read'],
    description: 'Fetch fuel fields for the given fuel ID',
    validate: {
      params: Joi.object({
        fuelId: Joi.string().required()
      })
    }
  },
  handler: async (request, h) => {
    const { fuelId } = request.params

    try {
      const result = await fuelController.getFuelById(request.db, fuelId, request.logger)
      
      if (!result.success) {
        return h.response(result).code(statusCodes.notFound)
      }

      return h.response(result).code(statusCodes.ok)
    } catch (error) {
      return h
        .response({
          success: false,
          message: 'Failed to fetch fuel',
          error: error.message
        })
        .code(statusCodes.internalServerError)
    }
  }
}
