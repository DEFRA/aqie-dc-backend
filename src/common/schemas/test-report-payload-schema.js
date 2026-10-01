import Joi from 'joi'

/**
 * Handles JavaScript floating-point rounding cases,
 * such as 1.005, which should round to 1.01.
 */
const roundToTwoDecimalPlaces = (value) => {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100

  return Number.isFinite(rounded) ? rounded : value
}

/**
 one rule for passed and failed measurements
 */
const measurement = Joi.number()
  .allow(null)
  .min(0)
  .optional()
  .strict()
  .custom(
    (value) => (value === null ? value : roundToTwoDecimalPlaces(value)),
    'round measurement to two decimal places'
  )

const outputPair = Joi.object({
  rated: measurement,
  low: measurement
})
  .unknown(false)
  .optional()

/**
 * Schema for passed test reports (result = true).
 * All measurement fields must be numbers rounded to two decimal places.
 */
export const testResultsSchema = Joi.object({
  ratedOutput: measurement,
  testedOutput: outputPair,
  smokeEmissionOutput: outputPair
}).unknown(false)
