/**
 * Show or hide an appliance from the public and recalculate its status
 */
import Joi from 'joi'
import * as applianceController from '../../controllers/appliances-controller.js'
import { createResultHandler } from '../../common/helpers/route-response.js'

export const updateApplianceVisibility = {
  method: 'PATCH',
  path: '/appliances/{id}/visibility',
  options: {
    tags: ['api', 'appliances'],
    description:
      'Set whether an appliance is visible to the public and recalculate its applianceStatus',
    validate: {
      params: Joi.object({
        id: Joi.string().max(64).required()
      }),
      payload: Joi.object({
        isVisibleToPublic: Joi.boolean().strict().required(),
        reviewedBy: Joi.object({
          name: Joi.string().max(255).required(),
          email: Joi.string().email().max(255).required()
        })
          .optional()
          .description('The signed-in user, supplied by the admin frontend')
      }).unknown(false)
    }
  },
  handler: createResultHandler(
    (request) =>
      applianceController.updateApplianceVisibility(
        request.db,
        request.params.id,
        request.payload.isVisibleToPublic,
        request.logger,
        'appliance',
        request.payload.reviewedBy
      ),
    {
      logMessage: 'Failed to update appliance visibility',
      fallbackMessage: 'Failed to update appliance visibility'
    }
  )
}
