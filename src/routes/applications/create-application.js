/**
 * Create a new application
 * POST /api/applications
 */

import Joi from 'joi'
import * as applicationsController from '../../controllers/applications-controller.js'

export const createApplication = {
  method: 'POST',
  path: '/api/applications',
  options: {
    tags: ['api', 'applications'],
    description: 'Create a new application',
    notes: 'Creates a new appliance or fuel application in the system',
    validate: {
      payload: Joi.object({
        applicationType: Joi.string()
          .valid('appliance', 'fuel')
          .required()
          .description('Type of application'),
        submittedAt: Joi.date()
          .optional()
          .description('When the application was created at (from form)'),
        additionalMetadata: Joi.object()
          .optional()
          .description('Optional additional metadata')
      }).unknown(false)
    }
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
