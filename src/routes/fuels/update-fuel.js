/**
 * Update fuel
 */

import Joi from 'joi'
import * as fuelController from '../../controllers/fuel-controller.js'
import { fuelSchema } from '../schema.js'
import { statusCodes } from '../../common/constants/status-codes.js'

export const updateFuel = {
  method: 'PATCH',
  path: '/fuels/{fuelId}',
  options: {
    tags: ['api', 'fuels'],
    description: 'Update fuel fields',
    validate: {
      params: Joi.object({
        fuelId: Joi.string().required()
      }),
      payload: Joi.object().unknown(true)
    }
  },
  handler: async (request, h) => {
    const { fuelId } = request.params

    try {
      const { notFound, updated } = await fuelController.updateFuel(
        request.db,
        fuelId,
        request.payload
      )
      if (notFound)
        return h.response({ msg: 'Not found' }).code(statusCodes.notFound)
      return h.response({ msg: 'Updated', data: updated }).code(statusCodes.ok)
    } catch (err) {
      request.logger.error(err, 'Failed to update fuel')
      return h
        .response({ msg: 'Failed to update fuel' })
        .code(statusCodes.internalServerError)
    }
  }
}
