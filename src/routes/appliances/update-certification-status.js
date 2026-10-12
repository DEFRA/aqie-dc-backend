/**
 * Update appliance certification status for a specific country
 * POST /appliances/{id}/certification/{country}
 */

import Joi from 'joi'
import * as applianceCertificationController from '../../controllers/appliance-certification-controller.js'
import { statusCodes } from '../../common/constants/status-codes.js'

export const updateCertificationStatus = {
  method: 'POST',
  path: '/appliances/{id}/certification/{country}',
  options: {
    tags: ['api', 'appliances', 'certification'],
    description: 'Update certification status for a specific country',
    validate: {
      params: Joi.object({
        id: Joi.string().required().description('Appliance ID'),
        country: Joi.string()
          .valid('england', 'scotland', 'wales', 'northern-ireland')
          .required()
          .description('Country code')
      }),
      payload: Joi.object({
        status: Joi.string()
          .valid('certified', 'uncertified', 'awaiting_decision')
          .required()
          .description('New certification status'),
        decidedBy: Joi.object({
          name: Joi.string().required(),
          email: Joi.string().email().required()
        })
          .optional()
          .description('User who made the decision (defaults to request user)')
      }).unknown(false)
    }
  },
  handler: async (request, h) => {
    const { id, country } = request.params
    const { status, decidedBy } = request.payload

    // Get decidedBy from request context (logged-in user) or use provided value
    const userInfo = decidedBy || {
      name: request.auth?.credentials?.name || 'System',
      email: request.auth?.credentials?.email || 'system@example.com'
    }

    try {
      const result = await applianceCertificationController.updateCertificationStatus(
        request.db,
        id,
        country,
        status,
        userInfo,
        request.logger
      )

      if (!result.success) {
        // Check if it's a validation error or not found
        if (result.error?.includes('not found')) {
          return h.response(result).code(statusCodes.notFound)
        }
        if (result.error?.includes('Invalid')) {
          return h.response(result).code(statusCodes.badRequest)
        }
        if (result.error?.includes('Cannot change status')) {
          return h.response(result).code(statusCodes.badRequest)
        }
        return h.response(result).code(statusCodes.internalServerError)
      }

      return h.response(result.data).code(statusCodes.ok)
    } catch (err) {
      request.logger.error(`Error updating certification status: ${err.message}`)
      return h
        .response({
          error: {
            statusCode: statusCodes.internalServerError,
            message: 'Internal server error'
          }
        })
        .code(statusCodes.internalServerError)
    }
  }
}
