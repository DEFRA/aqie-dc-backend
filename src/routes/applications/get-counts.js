/**
 * Get application counts by status
 */

import Boom from '@hapi/boom'
import { getCounts as getCountsController } from '../../controllers/applications-controller.js'
import { statusCodes } from '../../common/constants/status-codes.js'

export const getCounts = {
  method: 'GET',
  path: '/applications/counts',
  handler: async (request, h) => {
    try {
      const result = await getCountsController(request.db, request.logger)
      return h.response(result).code(statusCodes.ok)
    } catch (error) {
      request.logger.error(error, 'Failed to fetch counts')

      if (Boom.isBoom(error)) {
        throw error
      }

      const status = error?.status
      if (status && status >= statusCodes.internalServerError) {
        return Boom.badGateway(
          'Application counts service is currently unavailable'
        )
      }

      return Boom.internal('Failed to fetch counts')
    }
  }
}
