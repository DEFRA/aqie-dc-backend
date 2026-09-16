import Joi from 'joi'
import * as fuelController from '../../controllers/fuels-controller.js'
import { fuelSchema } from '../schema.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import fuelExample from '../../sample-data/fuel-example.js'

export const createFuel = {
  method: 'POST',
  path: '/fuels',
  options: {
    tags: ['api', 'fuels'],
    description: 'Create new fuel',

    validate: {
      // SHOW correct JSON example in Swagger, but do NOT validate here
      payload: Joi.object()
        .meta({ className: 'FuelInput' })
        .example(fuelExample)
        .description('Payload for fuel creation')
        .unknown(true) // allow anything, since real validation is below (in pre:)
    },

    pre: [
      {
        assign: 'validationResult',
        method: (request, _h) => {
          const { value, error } = fuelSchema.validate(request.payload, {
            abortEarly: false
          })

          const validationWarnings = error
            ? error.details.map((detail) => ({
                field: detail.path.join('.'),
                message: detail.message
              }))
            : []

          // Fall back to the raw payload if Joi couldn't produce a usable value, so the record still saves
          return {
            payload: value ?? request.payload,
            validationWarnings
          }
        }
      }
    ]
  },

  handler: async (request, h) => {
    const { payload, validationWarnings } = request.pre.validationResult

    // Log warnings but do not block the save to DB
    if (validationWarnings.length > 0) {
      request.logger.warn(
        { details: validationWarnings },
        'Fuel validation warnings'
      )
    }

    const newItem = {
      ...payload
    }
    try {
      const { data, message } = await fuelController.createFuel(
        request.db,
        newItem,
        request.logger
      )
      return h
        .response({
          success: true,
          message,
          data: { fuelId: data.fuelId }
        })
        .code(statusCodes.created)
    } catch (err) {
      request.logger.error(err, 'Failed to create fuel')
      return h
        .response({
          success: false,
          message: 'Failed to create fuel',
          error: err.message
        })
        .code(statusCodes.internalServerError)
    }
  }
}
