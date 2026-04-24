/**
 * Create a new application
 * POST /api/applications
 */

import * as applicationsController from '../../controllers/applications-controller.js'
import { applicationsSchema } from '../schema.js'
import Joi from 'joi'
import applicationExample from '../../sample-data/application-example.js'

//This doesnt have items (appliances in it)
export const createApplication = {
  method: 'POST',
  path: '/api/applications',
  options: {
    tags: ['api', 'applications'],
    description: 'Create a new application',
    notes: 'Creates a new appliance or fuel application in the system',
    validate: {
      payload: Joi.object()
          .example(applicationExample)
          .description('Payload for application creation')
    },
    pre: [
          {
            assign: 'validatedPayload',
            method: (request, h) => {
              const { value, error } = applicationsSchema.validate(request.payload, {
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
    try {
      const result = await applicationsController.createApplication(
        request.db,
        request.payload,
        request.logger
      )

      return h.response(result).code(201)
    } catch (error) {
      return h
        .response({
          success: false,
          message: 'Failed to create application',
          error: error.message
        })
        .code(500)
    }
  }
}
