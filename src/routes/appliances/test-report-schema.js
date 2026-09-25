import Joi from 'joi'

/**
 * Handles JavaScript floating-point rounding cases,
 * such as 1.005, which should round to 1.01.
 */
const roundToTwoDecimalPlaces = (value) => {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/**
 * Passed measurements:
 * - required
 * - numeric
 * - non-negative
 * - rounded to a maximum of two decimal places
 */
const passedMeasurement = Joi.number()
  .min(0)
  .required()
  .custom(
    (value) => roundToTwoDecimalPlaces(value),
    'round measurement to two decimal places'
  )

/**
 * Failed measurements:
 * - optional
 * - empty strings allowed
 * - alphabetic values allowed
 * - alphanumeric values allowed
 * - negative values allowed
 * - numeric values allowed
 * - null allowed for backward compatibility
 *
 * String is listed before number so submitted string values
 * remain strings when marking the report as failed.
 */
const failedMeasurement = Joi.alternatives()
  .try(Joi.string().allow(''), Joi.number(), Joi.valid(null))
  .optional()

const passedTestedOutput = Joi.object({
  rated: passedMeasurement,
  low: passedMeasurement
})
  .unknown(false)
  .required()

const failedTestedOutput = Joi.object({
  rated: failedMeasurement,
  low: failedMeasurement
})
  .unknown(false)
  .optional()

const passedSmokeEmissionOutput = Joi.object({
  rated: passedMeasurement,
  low: passedMeasurement
})
  .unknown(false)
  .required()

const failedSmokeEmissionOutput = Joi.object({
  rated: failedMeasurement,
  low: failedMeasurement
})
  .unknown(false)
  .optional()

export const testReportPayloadSchema = Joi.object({
  reviewStatus: Joi.boolean()
    .allow(null)
    .required()
    .description('true passed, false failed, null not reviewed'),

  ratedOutput: Joi.when('reviewStatus', {
    is: true,
    then: passedMeasurement,
    otherwise: failedMeasurement
  }),

  testedOutput: Joi.when('reviewStatus', {
    is: true,
    then: passedTestedOutput,
    otherwise: failedTestedOutput
  }),

  smokeEmissionOutput: Joi.when('reviewStatus', {
    is: true,
    then: passedSmokeEmissionOutput,
    otherwise: failedSmokeEmissionOutput
  })
}).unknown(false)
