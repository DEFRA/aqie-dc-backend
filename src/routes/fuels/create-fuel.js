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
        assign: 'validatedPayload',
        method: (request, h) => {
          const { value, error } = fuelSchema.validate(request.payload, {
            abortEarly: false
          })
          if (error) throw error
          return value
        },
        failAction: (request, h, error) => {
          request.logger.warn(error, 'Fuel validation failed')
          return h
            .response({
              success: false,
              message: 'Validation failed',
              details: error.details
            })
            .code(statusCodes.badRequest)
            .takeover()
        }
      }
    ]
  },

  handler: async (request, h) => {
    const newItem = {
      ...request.pre.validatedPayload
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
