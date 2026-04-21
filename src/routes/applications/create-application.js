/**
 * Create a new application
 * POST /api/applications
 */

import * as applicationsController from '../../controllers/applications-controller.js'
import { applicationsSchema } from '../schema.js'

export const createApplication = {
  method: 'POST',
  path: '/api/applications',
  options: {
    tags: ['api', 'applications'],
    description: 'Create a new application',
    notes: 'Creates a new appliance or fuel application in the system',
    validate: {
      payload: applicationsSchema
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
