/**
 * Update appliance
 */

import Joi from 'joi'
import * as applianceController from '../../controllers/appliances-controller.js'
import { applianceSchema } from '../schema.js'
import { STATUS_DRIVING_FIELDS } from '../../common/helpers/item-status.js'
import { createResultHandler } from '../../common/helpers/route-response.js'

// PATCH schema: all appliance fields optional, requires at least one key, and reject unknown extra fields.
// (Item) Status-driving fields are forbidden: they have dedicated endpoints.
const updateApplianceSchema = applianceSchema
  .fork(Object.keys(applianceSchema.describe().keys), (schema) =>
    schema.optional()
  )
  .fork([...STATUS_DRIVING_FIELDS, 'applianceStatus'], (schema) =>
    schema.forbidden()
  )
  .prefs({ noDefaults: true })
  .min(1)
  .unknown(false)

export const updateAppliance = {
  method: 'PATCH',
  path: '/appliances/{id}',
  options: {
    tags: ['api', 'appliances'],
    description: 'Update appliance fields',
    validate: {
      params: Joi.object({
        id: Joi.string().required()
      }),
      payload: updateApplianceSchema
    }
  },
  handler: createResultHandler(
    (request) =>
      applianceController.updateAppliance(
        request.db,
        request.params.id,
        request.payload,
        request.logger
      ),
    {
      logMessage: 'Failed to update appliance',
      fallbackMessage: 'Failed to update appliance'
    }
  )
}
