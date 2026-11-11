/**
 * Record the result of one fuel technical review check
 */
import Joi from 'joi'
import * as fuelReviewController from '../../controllers/fuel-review-controller.js'
import { ALL_FUEL_CHECKS } from '../../common/helpers/review-status.js'
import { createResultHandler } from '../../common/helpers/route-response.js'
import {
  passedFuelTestResultsSchema,
  failedFuelTestResultsSchema
} from '../../common/schemas/fuel-test-results-payload-schema.js'

/**
 * Passing the check requires both measurements; failing it saves whatever
 * the reviewer had entered, so only the shape is enforced.
 */
const TEST_RESULTS_DATA_SCHEMA = Joi.when('result', {
  is: true,
  then: Joi.object({
    testResults: passedFuelTestResultsSchema.required()
  })
    .unknown(false)
    .required(),
  otherwise: Joi.object({
    testResults: failedFuelTestResultsSchema.required()
  })
    .unknown(false)
    .required()
})

const CHECK_DATA_SCHEMAS = {
  testResults: TEST_RESULTS_DATA_SCHEMA
}

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
          switch: [
            {
              is: Joi.valid('fuelDescription'),
              then: Joi.boolean()
                .valid(true)
                .required()
                .description('fuelDescription can only be marked complete')
            },
            {
              is: 'testResults',
              then: Joi.boolean()
                .required()
                .description('true passed, false failed')
            }
          ],
          otherwise: Joi.boolean()
            .allow(null)
            .required()
            .description('true passed, false failed, null not reviewed')
        }),
        data: Joi.when('check', {
          switch: Object.entries(CHECK_DATA_SCHEMAS).map(([check, schema]) => ({
            is: check,
            then: schema
          })),
          otherwise: Joi.forbidden()
        })
      }).unknown(false)
    }
  },
  handler: createResultHandler(
    (request) => {
      const { check, result, data } = request.payload
      return fuelReviewController.recordFuelCheck(
        request.db,
        request.params.fuelId,
        check,
        result,
        request.logger,
        data
      )
    },
    {
      logMessage: 'Failed to record fuel check',
      fallbackMessage: 'Failed to record fuel check'
    }
  )
}
