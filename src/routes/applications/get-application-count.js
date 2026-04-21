/**
 * Get application counts by status
 */

import * as applicationsController from '../../controllers/applications-controller.js'

export const getInProgressApplicationCount = {
  method: 'GET',
  path: '/api/applications/count/in-progress',
  options: {
    tags: ['api', 'applications'],
    description: 'Get count of in-progress applications',
    notes: 'Returns the number of applications with status "in progress"'
  },
  handler: async (request, h) => {
    try {
      const result = await applicationsController.getInProgressCount(
        request.db,
        request.logger
      )

      return h.response(result).code(200)
    } catch (error) {
      return h
        .response({
          success: false,
          message: 'Failed to fetch in-progress application count',
          error: error.message
        })
        .code(500)
    }
  }
}

export const getNewApplicationCount = {
  method: 'GET',
  path: '/api/applications/count/new',
  options: {
    tags: ['api', 'applications'],
    description: 'Get count of new applications',
    notes: 'Returns the number of applications with status "new"'
  },
  handler: async (request, h) => {
    try {
      const result = await applicationsController.getNewCount(
        request.db,
        request.logger
      )

      return h.response(result).code(200)
    } catch (error) {
      return h
        .response({
          success: false,
          message: 'Failed to fetch new application count',
          error: error.message
        })
        .code(500)
    }
  }
}
