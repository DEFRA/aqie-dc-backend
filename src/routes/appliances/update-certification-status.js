/**
 * Update appliance certification status for a specific country
 * PATCH /appliances/{id}/certification/{country}
 */

import Joi from 'joi'
import * as applianceCertificationController from '../../controllers/appliance-certification-controller.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import { VALID_COUNTRY_CODES } from '../../common/helpers/certification.js'

export const updateCertificationStatus = {
  method: 'PATCH',
  path: '/appliances/{id}/certification/{country}',
  options: {
    tags: ['api', 'appliances', 'certification'],
    description: 'Update certification status for a specific country',
    validate: {
      params: Joi.object({
        id: Joi.string().required().description('Appliance ID'),
        country: Joi.string()
          .valid(...VALID_COUNTRY_CODES)
          .required()
          .description('Country code')
      }),
      payload: Joi.object({
        status: Joi.string()
          .valid('certified', 'uncertified')
          .required()
          .description('New certification status'),
        decidedBy: Joi.object({
          name: Joi.string().required(),
          email: Joi.string().email().required()
        })
          .required()
          .description(
            'The signed-in user who made the decision, supplied by the admin frontend'
          )
      }).unknown(false)
    }
  },
  handler: async (request, h) => {
    const { id, country } = request.params
    const { status, decidedBy } = request.payload
    const httpStatusByErrorCode = {
      NOT_FOUND: statusCodes.notFound,
      INVALID_COUNTRY: statusCodes.badRequest,
      INVALID_TRANSITION: statusCodes.badRequest,
      UPDATE_FAILED: statusCodes.internalServerError,
      INTERNAL_SERVER_ERROR: statusCodes.internalServerError
    }

    try {
      const result =
        await applianceCertificationController.updateCertificationStatus(
          request.db,
          id,
          country,
          status,
          decidedBy,
          request.logger
        )

      if (!result.success) {
        const statusCode =
          httpStatusByErrorCode[result.code] ?? statusCodes.internalServerError

        return h.response(result).code(statusCode)
      }

      return h
        .response({ success: true, data: result.data })
        .code(statusCodes.ok)
    } catch (err) {
      request.logger.error(
        `Error updating certification status: ${err.message}`
      )
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
