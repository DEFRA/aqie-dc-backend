/**
 * Mark an application as in progress once a reviewer has started reviewing it
 */
import Boom from '@hapi/boom'
import Joi from 'joi'
import * as applicationsController from '../../controllers/applications-controller.js'
import { statusCodes } from '../../common/constants/status-codes.js'

const MAX_LENGTH = 255

const startApplicationSchema = Joi.object({
  reviewedBy: Joi.object({
    name: Joi.string().max(MAX_LENGTH).required(),
    email: Joi.string().email().max(MAX_LENGTH).required()
  })
    .required()
    .description(
      'The signed-in reviewer, supplied by the admin frontend from its session'
    )
}).unknown(false)

export const startApplication = {
  method: 'PATCH',
  path: '/applications/{id}/in-progress',
  options: {
    tags: ['api', 'applications'],
    description:
      'Mark an application as in progress once a reviewer has started reviewing it',
    validate: {
      params: Joi.object({
        id: Joi.string().max(64).required()
      }),
      payload: startApplicationSchema
    }
  },
  handler: async (request, h) => {
    const { id } = request.params

    try {
      const result = await applicationsController.startApplication(
        request.db,
        id,
        request.payload,
        request.logger
      )

      if (result.notFound) {
        return h.response(result).code(statusCodes.notFound)
      }

      return h.response(result).code(statusCodes.ok)
    } catch (error) {
      request.logger.error(error, 'Failed to set application to in progress')

      if (Boom.isBoom(error)) {
        throw error
      }

      return Boom.internal('Failed to set application to in progress')
    }
  }
}
