import Boom from '@hapi/boom'
import {
  canAcceptFuelReview,
  getFuelCheckGroup,
  getFuelOutstandingChecks,
  isFuelCheckRequired
} from '../common/helpers/review-status.js'
import { calculateItemStatus } from '../common/helpers/item-status.js'
import { getFullAddress } from '../common/helpers/data-transformer.js'
import { updateFuel } from './fuels-controller.js'

/**
 * Fuel Review Controller
 * Business logic for the technical review of a fuel
 */

const LOGGER_REQUIRED_ERROR = 'logger is required'
const FUEL_NOT_FOUND = 'Fuel not found'

const notFoundResult = () => ({
  success: false,
  message: FUEL_NOT_FOUND,
  notFound: true
})

function requireBoolean(check, result) {
  if (typeof result !== 'boolean') {
    throw Boom.badRequest(
      `${check} result must be true (passed) or false (failed)`
    )
  }
}

const isValidMeasurement = (value) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0

function validateTestResults(result, data) {
  requireBoolean('testResults', result)

  const { smokeEmission, sulphurContent } = data?.testResults ?? {}

  if (result === true) {
    if (
      !isValidMeasurement(smokeEmission) ||
      !isValidMeasurement(sulphurContent)
    ) {
      throw Boom.badRequest(
        'testResults requires smokeEmission and sulphurContent, when marked as passed'
      )
    }
    return
  }

  // Failed: values are optional, but any that are present must be valid
  const present = [smokeEmission, sulphurContent].filter((v) => v != null)
  if (!present.every(isValidMeasurement)) {
    throw Boom.badRequest(
      'smokeEmission and sulphurContent must be non-negative numbers or null'
    )
  }
}

const isValidText = (value) =>
  typeof value === 'string' && value.trim().length > 0

const isValidPercentage = (value) =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 100

const FUEL_DESCRIPTION_RULES = {
  appearance: isValidText,
  weight: isValidText,
  composition: isValidText,
  sulphurContent: isValidPercentage
}

function validateFuelDescription(result, data) {
  if (result !== true) {
    throw Boom.badRequest('fuelDescription can only be marked complete')
  }

  const description = data?.fuelDescription ?? {}
  const complete =
    Object.entries(FUEL_DESCRIPTION_RULES).every(([name, isValid]) =>
      isValid(description[name])
    ) && isValidText(data?.manufacturingProcess)

  if (!complete) {
    throw Boom.badRequest(
      'fuelDescription requires appearance, weight, composition, sulphurContent and manufacturingProcess'
    )
  }
}

const REBRAND_DETAILS_FIELDS = ['brandName', 'additionalBrandNames']
const MANUFACTURE_DETAILS_FIELDS = [
  ...REBRAND_DETAILS_FIELDS,
  'hasQualityControlSystem',
  'fuelDescription',
  'manufacturingProcess'
]

const isCompleteDescription = (description) =>
  Object.entries(FUEL_DESCRIPTION_RULES).every(([name, isValid]) =>
    isValid(description?.[name])
  )

/**
 * fuelDetails can only be marked complete. Rebrand fuels capture the brand
 * details; Manufacture fuels also capture the description and process, because
 * they have no separate fuelDescription check.
 */
function validateFuelDetails(supplierType, result, data) {
  if (result !== true) {
    throw Boom.badRequest('fuelDetails can only be marked complete')
  }

  const isManufacture = supplierType === 'Manufacture'
  const allowed = isManufacture
    ? MANUFACTURE_DETAILS_FIELDS
    : REBRAND_DETAILS_FIELDS
  const details = data ?? {}
  const unexpected = Object.keys(details).filter((k) => !allowed.includes(k))

  const complete =
    isValidText(details.brandName) &&
    (details.additionalBrandNames == null ||
      typeof details.additionalBrandNames === 'string') &&
    (!isManufacture ||
      (typeof details.hasQualityControlSystem === 'boolean' &&
        isCompleteDescription(details.fuelDescription) &&
        isValidText(details.manufacturingProcess)))

  if (unexpected.length > 0 || !complete) {
    throw Boom.badRequest(
      isManufacture
        ? 'fuelDetails requires brandName, hasQualityControlSystem, fuelDescription (appearance, weight, composition, sulphurContent) and manufacturingProcess'
        : 'fuelDetails requires brandName'
    )
  }
}

// A blank list of brand names clears the stored value.
function normaliseFuelDetails(data) {
  const { additionalBrandNames, ...rest } = data
  return {
    ...rest,
    additionalBrandNames: additionalBrandNames?.trim() || null
  }
}

const checkValidators = {
  testResults: validateTestResults,
  fuelDescription: validateFuelDescription
}

function validateFuelCheck(check, result, data) {
  const group = getFuelCheckGroup(check)

  if (!group) {
    throw new Error(`Unrecognised check: ${check}`)
  }

  checkValidators[check]?.(result, data)

  return group
}

function buildCheckUpdatePayload(group, check, result, data) {
  return {
    ...data,
    technicalReview: { [group]: { [check]: result } }
  }
}

/**
 * Get the technical review state for one fuel.
 * Returns only the fields the review screen needs; company contact details are excluded.
 */
async function getFuelReview(db, fuelId, logger) {
  if (!logger) {
    throw new Error(LOGGER_REQUIRED_ERROR)
  }
  try {
    const item = await db.collection('Fuels').findOne(
      { id: fuelId },
      {
        projection: {
          id: 1,
          applicationId: 1,
          brandName: 1,
          additionalBrandNames: 1,
          companyAddress: 1,
          companyFullAddress: 1,
          supplierType: 1,
          fuelBagging: 1,
          fuelDescription: 1,
          manufacturingProcess: 1,
          hasQualityControlSystem: 1,
          originalFuel: 1,
          testResults: 1,
          technicalReview: 1,
          _id: 0
        }
      }
    )

    if (!item) {
      return notFoundResult()
    }

    const { brandName, companyAddress, companyFullAddress, ...rest } = item

    return {
      success: true,
      data: {
        ...rest,
        name: brandName,
        fullAddress: getFullAddress({ companyAddress, companyFullAddress }),
        outstandingChecks: getFuelOutstandingChecks(
          item.technicalReview,
          item.supplierType
        )
      }
    }
  } catch (error) {
    logger.error(error, 'Failed to fetch fuel review')
    throw error
  }
}

/**
 * Record the result of one documentation or listing check.
 * Recording the first result also moves the fuel from 'new' to 'in_review'.
 */
async function recordFuelCheck(db, fuelId, check, result, logger, data) {
  if (!logger) {
    throw new Error(LOGGER_REQUIRED_ERROR)
  }
  try {
    const group = validateFuelCheck(check, result, data)

    const item = await db
      .collection('Fuels')
      .findOne(
        { id: fuelId },
        { projection: { supplierType: 1, technicalReview: 1, _id: 0 } }
      )

    if (!item) {
      return notFoundResult()
    }

    if (!isFuelCheckRequired(check, item.supplierType)) {
      throw Boom.badRequest(
        `${check} does not apply to a ${item.supplierType} fuel`
      )
    }

    let payloadData = data
    if (check === 'fuelDetails') {
      validateFuelDetails(item.supplierType, result, data)
      payloadData = normaliseFuelDetails(data)
    }

    const updates = buildCheckUpdatePayload(group, check, result, payloadData)

    if (item.technicalReview?.status === 'new') {
      updates.technicalReview.status = 'in_review'
    }

    const updated = await updateFuel(db, fuelId, updates, logger)

    if (updated.notFound) {
      return notFoundResult()
    }

    logger.info(`Fuel check ${check} recorded as ${result}: ${fuelId}`)

    return { success: true, data: { fuelId, check, result } }
  } catch (error) {
    logger.error(error, 'Failed to record fuel check')
    throw error
  }
}

/**
 * Record the reviewer's decision on a fuel.
 * Accepting is refused until every documentation and listing check has passed.
 */
async function updateFuelReview(db, fuelId, decision, logger) {
  if (!logger) {
    throw new Error(LOGGER_REQUIRED_ERROR)
  }
  try {
    const item = await db
      .collection('Fuels')
      .findOne(
        { id: fuelId },
        { projection: { supplierType: 1, technicalReview: 1, _id: 0 } }
      )

    if (!item) {
      return notFoundResult()
    }

    const { status, reviewedBy } = decision
    const { supplierType, technicalReview } = item

    if (
      status === 'accepted' &&
      !canAcceptFuelReview(technicalReview, supplierType)
    ) {
      return {
        success: false,
        message: 'Fuel cannot be accepted until every check has passed',
        incomplete: true,
        outstandingChecks: getFuelOutstandingChecks(
          technicalReview,
          supplierType
        )
      }
    }

    const reviewedAt = new Date()

    const result = await updateFuel(
      db,
      fuelId,
      {
        technicalReview: { status, reviewedAt, reviewedBy: reviewedBy ?? null }
      },
      logger
    )

    if (result.notFound) {
      return notFoundResult()
    }

    await calculateItemStatus(db, 'fuel', fuelId)

    logger.info(`Fuel review ${status}: ${fuelId}`)

    // Only the decision is returned; the full record carries company contact details.
    return { success: true, data: { fuelId, status, reviewedAt } }
  } catch (error) {
    logger.error(error, 'Failed to update fuel review')
    throw error
  }
}

export { getFuelReview, recordFuelCheck, updateFuelReview }
