/**
 * Update appliance
 */

import Joi from 'joi'
import * as applianceController from '../../controllers/appliances-controller.js'
import { applianceSchema } from '../schema.js'
import { statusCodes } from '../../common/constants/status-codes.js'

// PATCH schema: all appliance fields optional, requires at least one key, and reject unknown extra fields.
const updateApplianceSchema = applianceSchema
  .fork(Object.keys(applianceSchema.describe().keys), (schema) =>
    schema.optional()
  )
  .min(1)
  .unknown(false)
  .prefs({ noDefaults: true })

export const updateAppliance = {
  method: 'PATCH',
  path: '/appliances/{applianceId}',
  options: {
    tags: ['api', 'appliances'],
    description: 'Update appliance fields',
    validate: {
      params: Joi.object({
        applianceId: Joi.string().required()
      }),
      payload: updateApplianceSchema
    }
  },
  handler: async (request, h) => {
    const { applianceId } = request.params

    try {
      const result = await applianceController.updateAppliance(
        request.db,
        applianceId,
        request.payload,
        request.logger
      )

      if (result.notFound) {
        return h.response(result).code(statusCodes.notFound)
      }

      return h.response(result).code(statusCodes.ok)
    } catch (err) {
      return h
        .response({
          success: false,
          message: 'Failed to update appliance',
          error: err.message
        })
        .code(statusCodes.internalServerError)
    }
  }
}
