import {
  isValidStatusTransition,
  loadDecisionTarget,
  requireArgs,
  saveDecision
} from './helpers/certification-helper.js'

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
  requireArgs({ db, applianceId, country, newStatus, decidedBy, logger })

  try {
    const target = await loadDecisionTarget(db, applianceId, country, logger)

    if (target.failure) {
      return target.failure
    }

    const { appliance, certificationField, certification, status } = target

    // Re-submitting the same decision is a no-op rather than an error
    if (status === newStatus) {
      return { success: true, data: appliance }
    }

    if (!isValidStatusTransition(status, newStatus)) {
      logger.warn(
        `Invalid status transition for ${applianceId} (${country}): ${status} -> ${newStatus}`
      )
      return {
        success: false,
        error: `Cannot change status from ${status} to ${newStatus}`
      }
    }

    return await saveDecision(
      db,
      {
        applianceId,
        country,
        certificationField,
        currentCertification: certification,
        currentStatus: status,
        newStatus,
        decidedBy
      },
      logger
    )
  } catch (error) {
    logger.error(`Error updating certification status: ${error.message}`)
    return { success: false, error: 'Internal server error' }
  }
}
