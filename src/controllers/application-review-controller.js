/**
 * Application Review Controller
 * Business logic for application status transitions (start / complete)
 */

import { isApplicationReviewComplete } from '../common/helpers/review-status.js'
import { getItemsCollectionName } from '../common/helpers/application-type.js'

const LOGGER_REQUIRED_ERROR = 'logger is required'
const APPLICATION_NOT_FOUND = 'Application not found'

/**
 * Complete an application once every linked appliance/fuel has been reviewed.
 * Records who completed it (reviewedBy) and when (reviewedAt).
 */
async function completeApplication(db, id, payload, logger) {
  if (!logger) {
    throw new Error(LOGGER_REQUIRED_ERROR)
  }
  try {
    const collection = db.collection('Applications')
    const application = await collection.findOne({ id })

    if (!application) {
      return {
        success: false,
        message: APPLICATION_NOT_FOUND,
        notFound: true
      }
    }

    const itemsCollectionName = getItemsCollectionName(application.type)

    if (!itemsCollectionName) {
      logger.warn(`Unknown application type: ${application.type}`)
      return {
        success: false,
        message: `Unknown application type: ${application.type}`,
        notFound: true
      }
    }

    const linkedItems = await db
      .collection(itemsCollectionName)
      .find(
        { applicationId: id },
        { projection: { technicalReview: 1, _id: 0 } }
      )
      .toArray()

    if (!isApplicationReviewComplete(linkedItems)) {
      return {
        success: false,
        message:
          'Application cannot be completed until every item has been reviewed',
        incomplete: true
      }
    }

    const { reviewedBy } = payload
    const reviewedAt = new Date()

    await collection.updateOne(
      { id },
      {
        $set: {
          status: 'complete',
          reviewedBy,
          reviewedAt,
          updatedAt: reviewedAt
        }
      }
    )

    logger.info(`Application completed: ${id}`)

    return {
      success: true,
      message: 'Application completed successfully',
      data: { id, status: 'complete', reviewedBy, reviewedAt }
    }
  } catch (error) {
    logger.error(error, 'Failed to complete application')
    throw error
  }
}

/**
 * Mark an application as in progress once a reviewer has started reviewing it.
 * Records who is reviewing it (reviewedBy).
 */
async function startApplication(db, id, payload, logger) {
  if (!logger) {
    throw new Error(LOGGER_REQUIRED_ERROR)
  }
  try {
    const collection = db.collection('Applications')
    const application = await collection.findOne({ id })

    if (!application) {
      return {
        success: false,
        message: APPLICATION_NOT_FOUND,
        notFound: true
      }
    }

    const { reviewedBy } = payload
    const updatedAt = new Date()

    await collection.updateOne(
      { id },
      {
        $set: {
          status: 'in_progress',
          reviewedBy,
          updatedAt
        }
      }
    )

    logger.info(`Application set to in progress: ${id}`)

    return {
      success: true,
      message: 'Application set to in progress successfully',
      data: { id, status: 'in_progress', reviewedBy, updatedAt }
    }
  } catch (error) {
    logger.error(error, 'Failed to set application to in progress')
    throw error
  }
}

export { completeApplication, startApplication }
