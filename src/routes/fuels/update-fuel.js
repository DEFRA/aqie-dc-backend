/**
 * Update fuel
 */

import Joi from 'joi'
import * as fuelController from '../../controllers/fuels-controller.js'
import { fuelSchema } from '../schema.js'
import { STATUS_DRIVING_FIELDS } from '../../common/helpers/item-status.js'
import { statusCodes } from '../../common/constants/status-codes.js'

// (Item) Status-driving fields are forbidden: they have dedicated endpoints.
const updateFuelSchema = fuelSchema
  .fork(Object.keys(fuelSchema.describe().keys), (schema) => schema.optional())
  .fork([...STATUS_DRIVING_FIELDS, 'fuelStatus'], (schema) =>
    schema.forbidden()
  )
  .prefs({ noDefaults: true })
  .min(1)
  .unknown(false)

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
      payload: updateFuelSchema
    }
  },
  handler: async (request, h) => {
    const { fuelId } = request.params

    try {
      const result = await fuelController.updateFuel(
        request.db,
        fuelId,
        request.payload,
        request.logger
      )

      if (result.notFound) {
        return h.response(result).code(statusCodes.notFound)
      }

      return h.response(result).code(statusCodes.ok)
    } catch (err) {
      return h
        .response({
          success: false,
          message: 'Failed to update fuel',
          error: err.message
        })
        .code(statusCodes.internalServerError)
    }
  }
}
