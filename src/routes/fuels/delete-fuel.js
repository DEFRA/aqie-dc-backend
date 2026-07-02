/**
 * Delete fuel
 */

import Joi from 'joi'
import * as fuelController from '../../controllers/fuels-controller.js'
import { statusCodes } from '../../common/constants/status-codes.js'

export const deleteFuel = {
  method: 'DELETE',
  path: '/fuels/{fuelId}',
  options: {
    tags: ['api', 'fuels'],
    description: 'Delete fuel by ID',
    validate: {
      params: Joi.object({
        fuelId: Joi.string().required()
      })
    }
  },
  handler: async (request, h) => {
    const { fuelId } = request.params

    try {
      const result = await fuelController.deleteFuel(request.db, fuelId, request.logger)
      
      if (result.notFound) {
        return h.response(result).code(statusCodes.notFound)
      }

      return h.response(result).code(statusCodes.ok)
    } catch (err) {
      return h
        .response({
          success: false,
          message: 'Failed to delete fuel',
          error: err.message
        })
        .code(statusCodes.internalServerError)
    }
  }
}
