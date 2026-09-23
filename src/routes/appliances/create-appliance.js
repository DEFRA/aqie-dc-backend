import Joi from 'joi'
import * as applianceController from '../../controllers/appliances-controller.js'
import { applianceSchema } from '../schema.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import applianceExample from '../../sample-data/appliance-example.js'

export const createAppliance = {
  method: 'POST',
  path: '/appliances',
  options: {
    tags: ['api', 'appliances'],
    description: 'Create new appliance',

    validate: {
      // SHOW correct JSON example in Swagger, but do NOT validate here
      payload: Joi.object()
        .meta({ className: 'ApplianceInput' })
        .example(applianceExample)
        .description('Payload for appliance creation')
        .unknown(true) // allow anything, since real validation is in pre
    },

    pre: [
      {
        assign: 'validationResult',
        method: (request, _h) => {
          const { value, error } = applianceSchema.validate(request.payload, {
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
        'Appliance validation warnings'
      )
    }

    const newItem = {
      ...payload
    }
    try {
      const { data, message } = await applianceController.createAppliance(
        request.db,
        newItem,
        request.logger
      )
      return h
        .response({
          success: true,
          message,
          data: { id: data.id }
        })
        .code(statusCodes.created)
    } catch (err) {
      request.logger.error(err, 'Failed to create appliance')
      return h
        .response({
          success: false,
          message: 'Failed to create appliance',
          error: err.message
        })
        .code(statusCodes.internalServerError)
    }
  }
}
