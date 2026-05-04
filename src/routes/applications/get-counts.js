/**
 * Get application counts by status
 */

import { getCounts as getCountsController } from '../../controllers/applications-controller.js'

export const getCounts = {
  method: 'GET',
  path: '/applications/counts',
  handler: async (request, h) => {
    const { db, logger } = request.server.app
    const result = await getCountsController(db, logger)
    return h.response(result).code(200)
  }
}
