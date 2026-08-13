/**
 * Create a new application
 * POST /applications
 */

import Boom from '@hapi/boom'
import * as applicationsController from '../../controllers/applications-controller.js'
import { applicationsSchema } from '../schema.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import Joi from 'joi'
import applicationExample from '../../sample-data/application-example.js'

//This doesnt have items (appliances/fuels in it)
export const createApplication = {
  method: 'POST',
  path: '/applications',
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
        assign: 'validationResult',
        method: (request, h) => {
          const { value, error } = applicationsSchema.validate(
            request.payload,
            {
              abortEarly: false
            }
          )

          const validationWarnings = error
            ? error.details.map((detail) => ({
                field: detail.path.join('.'),
                message: detail.message
              }))
            : []

          return {
            payload: value,
            validationWarnings
          }
        }
      }
    ]
  },

  handler: async (request, h) => {
    try {
      const { payload, validationWarnings } = request.pre.validationResult

      // Log warnings but do not block the save to DB
      if (validationWarnings.length > 0) {
        request.logger.warn(
          {
            validationWarnings
          },
          'Application validation warnings'
        )
      }

      const result = await applicationsController.createApplication(
        request.server.mongoClient,
        request.db,
        payload,
        request.logger
      )

      return h.response(result).code(statusCodes.created)
    } catch (error) {
      request.logger.error(error, 'Failed to create application')

      if (Boom.isBoom(error)) {
        throw error
      }

      const status = error?.status

      if (status && status >= statusCodes.internalServerError) {
        return Boom.badGateway('Application service is currently unavailable')
      }

      return Boom.internal('Failed to create application')
    }
  }
}
