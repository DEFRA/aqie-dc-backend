/**
 * Get fuel by ID
 */
//will change to -by-id after refactor
import Joi from 'joi'
import * as fuelController from '../../controllers/fuel-controller.js'
import { statusCodes } from '../../common/constants/status-codes.js'

export const getFuelById = {
  method: 'GET',
  path: '/fuels/{id}',
  options: {
    tags: ['api', 'read'],
    description: 'Fetch fuel fields for the given fuel ID',
    validate: {
      params: Joi.object({
        //type: Joi.string().valid('appliance', 'fuel').required(),
        id: Joi.string().required()
      })
    }
  },
  handler: async (request, h) => {
    const { id } = request.params

    try {
      const result = await fuelController.findFuel(request.db, id)
      if (!result) {
        return h
          .response({ message: 'Fuel not found' })
          .code(statusCodes.notFound)
      }

      return h.response({ msg: 'OK', data: result }).code(statusCodes.ok)
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
