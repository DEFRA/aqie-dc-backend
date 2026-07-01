import Joi from 'joi'
import * as applianceController from '../../controllers/appliance-controller.js'
import { applianceSchema } from '../schema.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import applianceExample from '../../sample-data/appliance-example.js'

//This is only used for creating appliances using Swagger, will keep incase it is needed in migration
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
        assign: 'validatedPayload',
        method: (request, h) => {
          const { value, error } = applianceSchema.validate(request.payload, {
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
      const { data } = await applianceController.createAppliance(
        request.db,
        newItem,
        request.logger
      )
      return h
        .response({ msg: 'Created', applianceId: data.applianceId })
        .code(statusCodes.created)
    } catch (err) {
      request.logger.error(err, 'Failed to create appliance')
      return h
        .response({ msg: 'Failed to create appliance' })
        .code(statusCodes.internalServerError)
    }
  }
}
