/**
 * Get applications summary by status (returns only appliance names)
 */

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
      return h
        .response({
          success: false,
          message: 'Failed to fetch applications summary',
          error: error.message
        })
        .code(statusCodes.internalServerError)
    }
  }
}
