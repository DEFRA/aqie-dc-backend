/**
 * Get application counts by status
 */

import { getCounts as getCountsController } from '../../controllers/applications-controller.js'

export const getCounts = {
  method: 'GET',
  path: '/applications/counts',
  handler: async (request, h) => {
    try {
      const result = await getCountsController(request.db, request.logger)
      return h.response(result).code(200)
    } catch (error) {
      return h
        .response({
          success: false,
          message: 'Failed to fetch counts',
          error: error.message
        })
        .code(500)
    }
  }
}
