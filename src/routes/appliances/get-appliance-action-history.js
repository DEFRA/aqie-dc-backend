/**
 * Get the action history for an appliance
 */
import Joi from 'joi'
import * as actionHistoryController from '../../controllers/action-history-controller.js'
import { createResultHandler } from '../../common/helpers/route-response.js'

export const getApplianceActionHistory = {
  method: 'GET',
  path: '/api/admin/appliances/{id}/action-history',
  options: {
    tags: ['api', 'admin', 'read'],
    description:
      'Fetch the action history for the given appliance ID, newest first',
    validate: {
      params: Joi.object({
        id: Joi.string().max(64).required()
      })
    }
  },
  handler: createResultHandler(
    (request) =>
      actionHistoryController.getActionHistory(
        request.db,
        'appliance',
        request.params.id,
        request.logger
      ),
    {
      logMessage: 'Failed to fetch appliance action history',
      fallbackMessage: 'Failed to fetch appliance action history'
    }
  )
}
