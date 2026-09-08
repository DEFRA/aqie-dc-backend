import {
  canAcceptReview,
  getCheckGroup,
  getOutstandingChecks
} from '../common/helpers/review-status.js'
import { updateAppliance } from './appliances-controller.js'

/**
 * Appliance Review Controller
 * Business logic for the technical review of an appliance
 */

const LOGGER_REQUIRED_ERROR = 'logger is required'
const APPLIANCE_NOT_FOUND = 'Appliance not found'

/**
 * Get the technical review state for one appliance.
 * Returns only the fields the review screen needs, not the whole record.
 */
async function getApplianceReview(db, id, logger) {
  if (!logger) {
    throw new Error(LOGGER_REQUIRED_ERROR)
  }
  try {
    const item = await db.collection('Appliances').findOne(
      { id },
      {
        projection: {
          id: 1,
          modelName: 1,
          applicationId: 1,
          technicalReview: 1,
          _id: 0
        }
      }
    )

    if (!item) {
      return {
        success: false,
        message: APPLIANCE_NOT_FOUND,
        notFound: true
      }
    }

    return {
      success: true,
      data: {
        ...item,
        outstandingChecks: getOutstandingChecks(item.technicalReview)
      }
    }
  } catch (error) {
    logger.error(error, 'Failed to fetch appliance review')
    throw error
  }
}

/**
 * Record the result of one documentation or listing check.
 * Recording the first result also moves the appliance from 'new' to
 * 'in_review', so the applications list can show "Continue review".
 */
async function recordApplianceCheck(db, id, check, result, logger) {
  if (!logger) {
    throw new Error(LOGGER_REQUIRED_ERROR)
  }
  try {
    const group = getCheckGroup(check)

    if (!group) {
      throw new Error(`Unrecognised check: ${check}`)
    }

    const item = await db
      .collection('Appliances')
      .findOne({ id }, { projection: { technicalReview: 1, _id: 0 } })

    if (!item) {
      return {
        success: false,
        message: APPLIANCE_NOT_FOUND,
        notFound: true
      }
    }

    const updates = { technicalReview: { [group]: { [check]: result } } }

    if (item.technicalReview?.status === 'new') {
      updates.technicalReview.status = 'in_review'
    }

    const updated = await updateAppliance(db, id, updates, logger)

    if (updated.notFound) {
      return {
        success: false,
        message: APPLIANCE_NOT_FOUND,
        notFound: true
      }
    }

    logger.info(`Appliance check ${check} recorded as ${result}: ${id}`)

    return {
      success: true,
      data: { id, check, result }
    }
  } catch (error) {
    logger.error(error, 'Failed to record appliance check')
    throw error
  }
}

/**
 * Record the reviewer's decision on an appliance.
 * Accepting is refused until every documentation and listing check has passed.
 */
async function updateApplianceReview(db, id, decision, logger) {
  if (!logger) {
    throw new Error(LOGGER_REQUIRED_ERROR)
  }
  try {
    const item = await db
      .collection('Appliances')
      .findOne({ id }, { projection: { technicalReview: 1, _id: 0 } })

    if (!item) {
      return {
        success: false,
        message: APPLIANCE_NOT_FOUND,
        notFound: true
      }
    }

    const { status, reviewedBy } = decision

    if (status === 'accepted' && !canAcceptReview(item.technicalReview)) {
      return {
        success: false,
        message: 'Appliance cannot be accepted until every check has passed',
        incomplete: true,
        outstandingChecks: getOutstandingChecks(item.technicalReview)
      }
    }

    const reviewedAt = new Date()

    const result = await updateAppliance(
      db,
      id,
      {
        technicalReview: { status, reviewedAt, reviewedBy: reviewedBy ?? null }
      },
      logger
    )

    if (result.notFound) {
      return {
        success: false,
        message: APPLIANCE_NOT_FOUND,
        notFound: true
      }
    }

    logger.info(`Appliance review ${status}: ${id}`) // Only the decision is returned - the full record from updateAppliance
    // carries company contact details this endpoint has no reason to expose.

    return {
      success: true,
      data: { id, status, reviewedAt }
    }
  } catch (error) {
    logger.error(error, 'Failed to update appliance review')
    throw error
  }
}

export { getApplianceReview, updateApplianceReview, recordApplianceCheck }
