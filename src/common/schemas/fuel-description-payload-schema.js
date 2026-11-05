import Joi from 'joi'

const text = Joi.string().trim().min(1)

/**
 * The check can only be marked complete, so every description field is required.
 */
export const fuelDescriptionSchema = Joi.object({
  appearance: text.required().description('Fuel appearance'),
  weight: text.required().description('Fuel weight (string, as per the form)'),
  composition: text.required().description('Fuel composition'),
  sulphurContent: Joi.number()
    .min(0)
    .max(100)
    .strict()
    .required()
    .description('Sulphur content (%)')
}).unknown(false)
