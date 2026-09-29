/**
 * Record the result of one technical review check
 */
import Boom from '@hapi/boom'
import Joi from 'joi'
import * as applianceReviewController from '../../controllers/appliance-review-controller.js'
import { ALL_CHECKS } from '../../common/helpers/review-status.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import { testReportPayloadSchema } from '../../common/schemas/test-report-payload-schema.js'
import {
  passedInstructionManualSchema,
  failedInstructionManualSchema
} from '../../common/schemas/instruction-manual-payload-schema.js'

const MAX_PERMITTED_FUELS_LENGTH = 3000
const MAX_ADDITIONAL_CONDITIONS_LENGTH = 1000

const ADDITIONAL_CONDITIONS_SCHEMA = Joi.object({
  additionalConditions: Joi.string()
    .trim()
    .min(1)
    .max(MAX_ADDITIONAL_CONDITIONS_LENGTH)
    .required()
}).unknown(false)

const TEST_REPORTS_DATA_SCHEMA = Joi.object({
    testResults: testReportPayloadSchema.required()
}).unknown(false)

/**
 * Passing the check requires the full manual details; failing it saves
 * whatever the reviewer had entered, so only the shape is enforced.
 */
const INSTRUCTION_MANUAL_DATA_SCHEMA = Joi.when('result', {
  is: true,
  then: Joi.object({
    instructionManual: passedInstructionManualSchema.required()
  })
    .unknown(false)
    .required(),
  otherwise: Joi.object({
    instructionManual: failedInstructionManualSchema.required()
  })
    .unknown(false)
    .optional()
})

const CHECK_DATA_SCHEMAS = {
  permittedFuels: Joi.object({
    permittedFuels: Joi.string()
      .trim()
      .min(1)
      .max(MAX_PERMITTED_FUELS_LENGTH)
      .required(),
    isPermittedToBurnWood: Joi.boolean().allow(null).required()
  })
    .unknown(false)
    .required(),
  additionalConditions: ADDITIONAL_CONDITIONS_SCHEMA.required(),
  testReports: Joi.when('result', {
    is: false,
    then: TEST_REPORTS_DATA_SCHEMA.optional(),
    otherwise: TEST_REPORTS_DATA_SCHEMA.required()
  }),
  instructionManual: INSTRUCTION_MANUAL_DATA_SCHEMA
}

export const recordApplianceCheck = {
  method: 'PATCH',
  path: '/appliances/{id}/technical-review/checks',
  options: {
    tags: ['api', 'appliances'],
    description: 'Record the result of a single documentation or listing check',
    validate: {
      params: Joi.object({
        id: Joi.string().max(64).required()
      }),
      payload: Joi.object({
        check: Joi.string()
          .valid(...ALL_CHECKS)
          .required()
          .description('Which check the result applies to'),
        result: Joi.when('check', {
          switch: [
            {
              is: 'additionalConditions',
              then: Joi.boolean()
                .valid(true)
                .required()
                .description(
                  'additionalConditions must be marked complete to be saved'
                )
            },
            {
              is: 'testReports',
              then: Joi.boolean()
                .required()
                .description('true passed, false failed')
            },
            {
              is: 'instructionManual',
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
  handler: async (request, h) => {
    const { id } = request.params
    const { check, result, data } = request.payload

    try {
      const outcome = await applianceReviewController.recordApplianceCheck(
        request.db,
        id,
        check,
        result,
        request.logger,
        data
      )
      if (outcome.notFound) {
        return h.response(outcome).code(statusCodes.notFound)
      }

      return h.response(outcome).code(statusCodes.ok)
    } catch (error) {
      request.logger.error(error, 'Failed to record appliance check')

      if (Boom.isBoom(error)) {
        throw error
      }

      return Boom.internal('Failed to record appliance check')
    }
  }
}
