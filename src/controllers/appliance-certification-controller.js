import { generateSecureId } from '../common/helpers/data-transformer.js'
import { calculateItemStatus } from '../common/helpers/item-status.js'
import { actionDescriptions } from '../common/schemas/action-schema.js'

// Map of country codes to certification field names
const countryToCertificationField = {
  england: 'englandCertification',
  scotland: 'scotlandCertification',
  wales: 'walesCertification',
  'northern-ireland': 'nIrelandCertification'
}

// Prefix used when building audit action keys, e.g. `nIrelandCertified`
const countryToActionPrefix = {
  england: 'england',
  scotland: 'scotland',
  wales: 'wales',
  'northern-ireland': 'nIreland'
}

const statusToActionSuffix = {
  certified: 'Certified',
  uncertified: 'Uncertified',
  awaiting_decision: 'AwaitingDecision'
}

const allowedTransitions = {
  awaiting_decision: ['certified', 'uncertified'],
  certified: ['uncertified'],
  uncertified: ['certified']
}

const isValidStatusTransition = (currentStatus, newStatus) =>
  allowedTransitions[currentStatus]?.includes(newStatus) ?? false

/**
 * Append an audit entry. Failure to record history must not fail the decision
 * itself, so errors are logged and swallowed.
 */
const recordCertificationAction = async (
  db,
  { applianceId, country, fromStatus, toStatus, decidedBy, at },
  logger
) => {
  const action = `${countryToActionPrefix[country]}${statusToActionSuffix[toStatus]}`

  try {
    await db.collection('Actions').insertOne({
      id: `ACT-${generateSecureId()}`,
      itemId: applianceId,
      type: 'certification',
      action,
      description: actionDescriptions[action],
      country,
      fromStatus,
      toStatus,
      completedBy: decidedBy,
      completedAt: at
    })
  } catch (error) {
    logger.error(
      `Failed to record certification action for ${applianceId}: ${error.message}`
    )
  }
}

/**
 * Update appliance certification status for a specific country
 * @param {Object} db - MongoDB database connection
 * @param {string} applianceId - The appliance ID
 * @param {string} country - Country code (england, scotland, wales, northern-ireland)
 * @param {string} newStatus - New status (certified, uncertified, awaiting_decision)
 * @param {Object} decidedBy - User who made the decision {name, email}
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object>} Response object {success: boolean, data?: appliance, error?: string}
 */
export const updateCertificationStatus = async (
  db,
  applianceId,
  country,
  newStatus,
  decidedBy,
  logger
) => {
  if (!db) {
    throw new Error('db is required')
  }
  if (!applianceId) {
    throw new Error('applianceId is required')
  }
  if (!country) {
    throw new Error('country is required')
  }
  if (!newStatus) {
    throw new Error('newStatus is required')
  }
  if (!decidedBy) {
    throw new Error('decidedBy is required')
  }
  if (!logger) {
    throw new Error('logger is required')
  }

  try {
    const certificationField = countryToCertificationField[country]

    if (!certificationField) {
      logger.warn(`Invalid country code: ${country}`)
      return {
        success: false,
        error: `Invalid country: ${country}. Must be one of: england, scotland, wales, northern-ireland`
      }
    }

    const appliancesCollection = db.collection('Appliances')
    const appliance = await appliancesCollection.findOne({ id: applianceId })

    if (!appliance) {
      logger.warn(`Appliance not found: ${applianceId}`)
      return { success: false, error: `Appliance not found: ${applianceId}` }
    }

    const currentCertification = appliance[certificationField] || {}
    const currentStatus = currentCertification.status || 'awaiting_decision'

    // Re-submitting the same decision is a no-op rather than an error
    if (currentStatus === newStatus) {
      return { success: true, data: appliance }
    }

    if (!isValidStatusTransition(currentStatus, newStatus)) {
      logger.warn(
        `Invalid status transition for ${applianceId} (${country}): ${currentStatus} -> ${newStatus}`
      )
      return {
        success: false,
        error: `Cannot change status from ${currentStatus} to ${newStatus}`
      }
    }

    const now = new Date()

    // Replace the whole certification object, carrying the milestones forward
    const certification = {
      status: newStatus,
      decidedAt: now,
      decidedBy,
      firstCertifiedAt: currentCertification.firstCertifiedAt ?? null,
      lastCertifiedAt: currentCertification.lastCertifiedAt ?? null
    }

    if (newStatus === 'certified') {
      certification.firstCertifiedAt = certification.firstCertifiedAt ?? now
      certification.lastCertifiedAt = now
    }

    const updated = await appliancesCollection.findOneAndUpdate(
      { id: applianceId },
      { $set: { [certificationField]: certification, updatedAt: now } },
      { returnDocument: 'after' }
    )

    if (!updated) {
      logger.error(`Failed to update appliance: ${applianceId}`)
      return { success: false, error: 'Failed to update appliance' }
    }

    // The decision is already saved, so a failed rollup is logged, not surfaced.
    try {
      await calculateItemStatus(db, 'appliance', applianceId)
    } catch (error) {
      logger.error(
        `Failed to recalculate applianceStatus for ${applianceId}: ${error.message}`
      )
    }

    await recordCertificationAction(
      db,
      {
        applianceId,
        country,
        fromStatus: currentStatus,
        toStatus: newStatus,
        decidedBy,
        at: now
      },
      logger
    )

    logger.info(
      `Certification status updated: ${applianceId} (${country}: ${currentStatus} -> ${newStatus})`
    )

    return { success: true, data: updated }
  } catch (error) {
    logger.error(`Error updating certification status: ${error.message}`)
    return { success: false, error: 'Internal server error' }
  }
}
