import Joi from 'joi'

const measurement = Joi.number().min(0).strict()

/**
 * Passing the check requires both measurements; failing it saves whatever
 * the reviewer had entered, where null clears a stored value.
 */
export const passedFuelTestResultsSchema = Joi.object({
  smokeEmission: measurement.required().description('Smoke emission (g/h)'),
  sulphurContent: measurement
    .max(100)
    .required()
    .description('Sulphur content (%)')
}).unknown(false)

export const failedFuelTestResultsSchema = Joi.object({
  smokeEmission: measurement.allow(null).optional(),
  sulphurContent: measurement.max(100).allow(null).optional()
}).unknown(false)
