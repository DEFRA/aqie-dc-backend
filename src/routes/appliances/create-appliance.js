import Joi from 'joi'
import * as applianceController from '../../controllers/appliance-controller.js'
import { applianceSchema } from '../schema.js'
import applianceExample from '../../sample-data/appliance-example.js'

//Note: this code has been moved from api, needs refactoring
export const createAppliance = {
  method: 'POST',
  path: '/add-new/appliance',
  options: {
    tags: ['api', 'new'],
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
            .code(400)
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
      const inserted = await applianceController.createAppliance(
        request.db,
        'appliance',
        newItem
      )
      const applicationId =
        inserted.data?.applianceId ||
        inserted.data?.fuelId ||
        String(inserted.data?._id)
      return h.response({ msg: 'Created', applicationId }).code(201)
    } catch (err) {
      request.server.logger?.error(err, 'Failed to create item')
      return h.response({ msg: 'Failed to create item' }).code(500)
    }
  }
}
