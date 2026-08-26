/**
 * Get all applications
 * Pagination is not currently supported; all applications are returned
 */

import Boom from '@hapi/boom'
import * as applicationsController from '../../controllers/applications-controller.js'
import { statusCodes } from '../../common/constants/status-codes.js'

export const getAllApplications = {
  method: 'GET',
  path: '/applications',
  options: {
    tags: ['api', 'applications'],
    description: 'Get all applications',
    notes: 'Returns all applications'
  },
  handler: async (request, h) => {
    try {
      const result = await applicationsController.getAllApplications(
        request.db,
        { page: 1, limit: 999999 },
        request.logger
      )

      return h.response(result).code(statusCodes.ok)
    } catch (error) {
      request.logger.error(error, 'Failed to fetch applications')

      if (Boom.isBoom(error)) {
        throw error
      }

      const status = error?.status
      if (status && status >= statusCodes.internalServerError) {
        return Boom.badGateway('Application service is currently unavailable')
      }

      return Boom.internal('Failed to fetch applications')
    }
  }
}
