/**
 * Record the result of one fuel technical review check
 */
import Joi from 'joi'
import * as fuelReviewController from '../../controllers/fuel-review-controller.js'
import { ALL_FUEL_CHECKS } from '../../common/helpers/review-status.js'
import { createResultHandler } from '../../common/helpers/route-response.js'

export const recordFuelCheck = {
  method: 'PATCH',
  path: '/fuels/{fuelId}/technical-review/checks',
  options: {
    tags: ['api', 'fuels'],
    description: 'Record the result of a single documentation or listing check',
    validate: {
      params: Joi.object({
        fuelId: Joi.string().max(64).required()
      }),
      payload: Joi.object({
        check: Joi.string()
          .valid(...ALL_FUEL_CHECKS)
          .required()
          .description('Which check the result applies to'),
        result: Joi.when('check', {
          is: 'testResults',
          then: Joi.boolean()
            .required()
            .description('true passed, false failed'),
          otherwise: Joi.boolean()
            .allow(null)
            .required()
            .description('true passed, false failed, null not reviewed')
        })
      }).unknown(false)
    }
  },
  handler: createResultHandler(
    (request) => {
      const { check, result } = request.payload
      return fuelReviewController.recordFuelCheck(
        request.db,
        request.params.fuelId,
        check,
        result,
        request.logger
      )
    },
    {
      logMessage: 'Failed to record fuel check',
      fallbackMessage: 'Failed to record fuel check'
    }
  )
}
