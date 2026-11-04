/**
 * Record the result of individual fuel attribute checks
 * These endpoints handle individual fuel attributes during technical review
 */
import Joi from 'joi'
import * as fuelReviewController from '../../controllers/fuel-review-controller.js'
import { createResultHandler } from '../../common/helpers/route-response.js'

const MAX_BRAND_NAME_LENGTH = 255
const MAX_ADDITIONAL_BRAND_NAMES_LENGTH = 500
const MAX_FUEL_APPEARANCE_LENGTH = 1000
const MAX_FUEL_COMPOSITION_LENGTH = 1000
const MAX_MANUFACTURING_PROCESS_LENGTH = 1000

// Individual attribute schemas
const brandNameSchema = Joi.object({
  brandName: Joi.string().trim().min(1).max(MAX_BRAND_NAME_LENGTH).required()
})
  .unknown(false)
  .required()

const additionalBrandNamesSchema = Joi.object({
  hasAdditionalBrandNames: Joi.boolean()
    .strict()
    .required()
    .description('Will the fuel be sold under any additional brand names?'),
  additionalBrandNames: Joi.when('hasAdditionalBrandNames', {
    is: true,
    then: Joi.string()
      .trim()
      .min(1)
      .max(MAX_ADDITIONAL_BRAND_NAMES_LENGTH)
      .required(),
    otherwise: Joi.valid(null, '').optional()
  }).description(
    'Comma-separated brand names; required when Yes, empty when No'
  )
})
  .unknown(false)
  .required()

const fuelAppearanceSchema = Joi.object({
  fuelAppearance: Joi.string()
    .trim()
    .min(1)
    .max(MAX_FUEL_APPEARANCE_LENGTH)
    .required()
})
  .unknown(false)
  .required()

const fuelWeightSchema = Joi.object({
  fuelWeight: Joi.number().positive().required()
})
  .unknown(false)
  .required()

const fuelCompositionSchema = Joi.object({
  fuelComposition: Joi.string()
    .trim()
    .min(1)
    .max(MAX_FUEL_COMPOSITION_LENGTH)
    .required()
})
  .unknown(false)
  .required()

const sulphurContentSchema = Joi.object({
  sulphurContent: Joi.number().min(0).required()
})
  .unknown(false)
  .required()

const manufacturingProcessSchema = Joi.object({
  manufacturingProcess: Joi.string()
    .trim()
    .min(1)
    .max(MAX_MANUFACTURING_PROCESS_LENGTH)
    .required()
})
  .unknown(false)
  .required()

const hasQualityControlSystemSchema = Joi.object({
  hasQualityControlSystem: Joi.boolean().strict().required()
})
  .unknown(false)
  .required()

const ATTRIBUTE_SCHEMAS = {
  brandName: brandNameSchema,
  additionalBrandNames: additionalBrandNamesSchema,
  fuelAppearance: fuelAppearanceSchema,
  fuelWeight: fuelWeightSchema,
  fuelComposition: fuelCompositionSchema,
  sulphurContent: sulphurContentSchema,
  manufacturingProcess: manufacturingProcessSchema,
  hasQualityControlSystem: hasQualityControlSystemSchema
}

const ATTRIBUTES = Object.keys(ATTRIBUTE_SCHEMAS)

/**
 * Factory function to create a route handler for a specific fuel attribute
 */
function createAttributeCheckRoute(attribute) {
  return {
    method: 'PATCH',
    path: `/fuels/{fuelId}/technical-review/${attribute}`,
    options: {
      tags: ['api', 'fuels'],
      description: `Record the ${attribute} check for a fuel during technical review`,
      validate: {
        params: Joi.object({
          fuelId: Joi.string().max(64).required()
        }),
        payload: Joi.object({
          result: Joi.boolean()
            .allow(null)
            .required()
            .description('true passed, false failed, null not reviewed'),
          data: ATTRIBUTE_SCHEMAS[attribute].required()
        }).unknown(false)
      }
    },
    handler: createResultHandler(
      (request) => {
        const { result, data } = request.payload
        return fuelReviewController.recordFuelCheck(
          request.db,
          request.params.fuelId,
          attribute,
          result,
          request.logger,
          data
        )
      },
      {
        logMessage: `Failed to record ${attribute} check`,
        fallbackMessage: `Failed to record ${attribute} check`
      }
    )
  }
}

// Export all attribute check routes
export const recordBrandNameCheck = createAttributeCheckRoute('brandName')
export const recordAdditionalBrandNamesCheck = createAttributeCheckRoute(
  'additionalBrandNames'
)
export const recordFuelAppearanceCheck =
  createAttributeCheckRoute('fuelAppearance')
export const recordFuelWeightCheck = createAttributeCheckRoute('fuelWeight')
export const recordFuelCompositionCheck =
  createAttributeCheckRoute('fuelComposition')
export const recordSulphurContentCheck =
  createAttributeCheckRoute('sulphurContent')
export const recordManufacturingProcessCheck = createAttributeCheckRoute(
  'manufacturingProcess'
)
export const recordHasQualityControlSystemCheck = createAttributeCheckRoute(
  'hasQualityControlSystem'
)

export const ATTRIBUTE_CHECK_ROUTES = ATTRIBUTES.map((attr) =>
  createAttributeCheckRoute(attr)
)
