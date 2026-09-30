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
 * - no coercion from strings (must be actual numbers)
 */
const passedMeasurement = Joi.number()
  .min(0)
  .required()
  .strict()
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

/**
 * Schema for passed test reports (result = true).
 * All measurement fields must be numbers rounded to two decimal places.
 */
export const passedTestReportSchema = Joi.object({
  ratedOutput: passedMeasurement,
  testedOutput: passedTestedOutput,
  smokeEmissionOutput: passedSmokeEmissionOutput
}).unknown(false)

/**
 * Schema for failed test reports (result = false).
 * Measurement fields can be strings, numbers, empty, or null.
 */
export const failedTestReportSchema = Joi.object({
  ratedOutput: failedMeasurement,
  testedOutput: failedTestedOutput,
  smokeEmissionOutput: failedSmokeEmissionOutput
}).unknown(false)

/**
 * @deprecated Use passedTestReportSchema or failedTestReportSchema instead.
 * Schema that uses conditional logic based on reviewStatus (legacy).
 */
export const testReportPayloadSchema = Joi.object({
  ratedOutput: Joi.alternatives()
    .try(Joi.number(), Joi.string().allow(''))
    .optional(),
  testedOutput: Joi.object({
    rated: Joi.alternatives()
      .try(Joi.number(), Joi.string().allow(''))
      .optional(),
    low: Joi.alternatives().try(Joi.number(), Joi.string().allow('')).optional()
  }).optional(),
  smokeEmissionOutput: Joi.object({
    rated: Joi.alternatives()
      .try(Joi.number(), Joi.string().allow(''))
      .optional(),
    low: Joi.alternatives().try(Joi.number(), Joi.string().allow('')).optional()
  }).optional()
}).unknown(false)
