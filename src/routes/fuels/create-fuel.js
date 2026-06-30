import Joi from 'joi'
import * as fuelController from '../../controllers/fuel-controller.js'
import { fuelSchema } from '../schema.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import fuelExample from '../../sample-data/fuel-example.js'

//Note: this is a duplicate of applicance so after refactored that file then need to refactor this one too
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
        .unknown(true) // allow anything, since real validation is in pre
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
          // Return 400 with validation details
          return h
            .response({ msg: 'Validation failed', details: error.details })
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
      const inserted = await fuelController.createFuel(
        request.db,
        newItem
      )
      const applicationId = inserted.fuelId || String(inserted._id)
      return h.response({ msg: 'Created', applicationId }).code(statusCodes.created)
    } catch (err) {
      request.logger.error(err, 'Failed to create fuel')
      return h.response({ msg: 'Failed to create fuel' }).code(statusCodes.internalServerError)
    }
  }
}
