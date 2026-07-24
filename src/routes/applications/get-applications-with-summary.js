/**
 * Get applications summary by status (returns only appliance names)
 */

import Boom from '@hapi/boom'
import * as applicationsController from '../../controllers/applications-controller.js'
import { statusCodes } from '../../common/constants/status-codes.js'

export const getApplicationsWithSummary = {
  method: 'GET',
  path: '/applications/summary',
  options: {
    tags: ['api', 'applications'],
    description:
      'Get summary of (uncomplete) applications by status with appliance names',
    notes:
      'Returns (uncomplete) applications grouped by status ("new", "in_progress") along with their appliances summary (names only)'
  },
  handler: async (request, h) => {
    try {
      const result = await applicationsController.getApplicationsWithSummary(
        request.db,
        request.logger
      )

      return h.response(result).code(statusCodes.ok)
    } catch (error) {
      request.logger.error(error, 'Failed to fetch applications summary')

      if (Boom.isBoom(error)) {
        throw error
      }

      const status = error?.status
      if (status && status >= statusCodes.internalServerError) {
        return Boom.badGateway('Application service is currently unavailable')
      }

      return Boom.internal('Failed to fetch applications summary')
    }
  }
}
