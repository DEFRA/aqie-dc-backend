import Boom from '@hapi/boom'
import {
  canAcceptFuelReview,
  getFuelCheckGroup,
  getFuelOutstandingChecks,
  isFuelCheckRequired
} from '../common/helpers/review-status.js'
import { calculateItemStatus } from '../common/helpers/item-status.js'
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

function validateFuelCheck(check, result) {
  const group = getFuelCheckGroup(check)

  if (!group) {
    throw new Error(`Unrecognised check: ${check}`)
  }

  if (check === 'testResults' && typeof result !== 'boolean') {
    throw Boom.badRequest(
      'testResults result must be true (passed) or false (failed)'
    )
  }

  return group
}

/**
 * Record the result of one documentation or listing check.
 * Recording the first result also moves the fuel from 'new' to 'in_review'.
 */
async function recordFuelCheck(db, fuelId, check, result, logger) {
  if (!logger) {
    throw new Error(LOGGER_REQUIRED_ERROR)
  }
  try {
    const group = validateFuelCheck(check, result)

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

    const technicalReview = { [group]: { [check]: result } }

    if (item.technicalReview?.status === 'new') {
      technicalReview.status = 'in_review'
    }

    const updated = await updateFuel(db, fuelId, { technicalReview }, logger)

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

export { recordFuelCheck, updateFuelReview }
