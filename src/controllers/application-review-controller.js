/**
 * Application Review Controller
 * Business logic for application status transitions (start / complete)
 */

import {
  groupItemsByTechReviewStatus,
  isApplicationReviewComplete
} from '../common/helpers/review-status.js'
import { getItemsCollectionName } from '../common/helpers/application-type.js'
import { CERTIFICATION_FIELDS } from '../common/helpers/certification.js'
import {
  SYSTEM_ACTOR,
  recordAction,
  toUserActor
} from '../common/helpers/action-history.js'
import { calculateItemStatus } from '../common/helpers/item-status.js'

const LOGGER_REQUIRED_ERROR = 'logger is required'
const APPLICATION_NOT_FOUND = 'Application not found'

const REVIEW_OUTCOME_ACTIONS = {
  accepted: 'acceptedAtApplication',
  rejected: 'rejectedAtApplication'
}

// Every item's final technical review outcome, recorded once the application completes.
const recordReviewOutcomes = (
  db,
  application,
  linkedItems,
  reviewedBy,
  at,
  logger
) =>
  Promise.all(
    linkedItems.map((item) =>
      recordAction(
        db,
        {
          itemId: item.id,
          itemType: application.type,
          action: REVIEW_OUTCOME_ACTIONS[item.technicalReview.status],
          actor: toUserActor(reviewedBy),
          at
        },
        logger
      )
    )
  )

// TODO: the email to the DAs (governments) is NOT built yet; only the log line below
// stands in for it. Replace the body with the real send, and throw if it fails so
// nothing after it runs.
const sendEmailToDAs = async (application, acceptedItems, logger) => {
  logger.info(
    `Email sent to DA for application ${application.id} (${acceptedItems.length} accepted items)`
  )
}

// Only accepted items go to the governments; rejected ones never leave HETAS.
const recordSentToGovernments = (db, application, acceptedItems, at, logger) =>
  Promise.all(
    acceptedItems.map((item) =>
      recordAction(
        db,
        {
          itemId: item.id,
          itemType: application.type,
          action: 'sentToGovernments',
          actor: SYSTEM_ACTOR,
          at
        },
        logger
      )
    )
  )

// The application is already complete, so a failed rollup is logged, not surfaced.
const refreshItemStatuses = (db, type, items, logger) =>
  Promise.all(
    items.map(async ({ id }) => {
      try {
        await calculateItemStatus(db, type, id, { logger })
      } catch (error) {
        logger.error(
          `Failed to recalculate ${type} status for ${id}: ${error.message}`
        )
      }
    })
  )

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
        { projection: { id: 1, technicalReview: 1, _id: 0 } }
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
    const acceptedItems = groupItemsByTechReviewStatus(linkedItems).accepted

    // A repeat completion (e.g. a double submit) must not repeat history or the email.
    const firstCompletion = application.status !== 'complete'

    if (firstCompletion) {
      await recordReviewOutcomes(
        db,
        application,
        linkedItems,
        reviewedBy,
        reviewedAt,
        logger
      )
      // Nothing to send when every item was rejected.
      if (acceptedItems.length > 0) {
        // Everything below only happens once the email has gone out.
        await sendEmailToDAs(application, acceptedItems, logger)
        await recordSentToGovernments(
          db,
          application,
          acceptedItems,
          reviewedAt,
          logger
        )
      }
    }

    // Sent to the DAs, so each accepted item's still-new countries now await their decision...
    await Promise.all(
      CERTIFICATION_FIELDS.map((field) =>
        db.collection(itemsCollectionName).updateMany(
          {
            applicationId: id,
            id: { $in: acceptedItems.map((item) => item.id) },
            [`${field}.status`]: 'new'
          },
          { $set: { [`${field}.status`]: 'awaiting_decision' } }
        )
      )
    )

    // ...and the application is complete.
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

    // Last, so each item is rolled up from its awaiting_decision countries.
    await refreshItemStatuses(db, application.type, linkedItems, logger)

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
