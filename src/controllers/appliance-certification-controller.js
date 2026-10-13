import {
  buildCertification,
  countryToCertificationField,
  isValidStatusTransition,
  readCertification,
  recordCertificationAction,
  refreshApplianceStatus,
  requireArgs
} from './helpers/appliance-certification-helper.js'

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

    const { certification: currentCertification, status: currentStatus } =
      readCertification(appliance, certificationField)

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
    const certification = buildCertification(
      currentCertification,
      newStatus,
      decidedBy,
      now
    )

    const updated = await appliancesCollection.findOneAndUpdate(
      { id: applianceId },
      { $set: { [certificationField]: certification, updatedAt: now } },
      { returnDocument: 'after' }
    )

    if (!updated) {
      logger.error(`Failed to update appliance: ${applianceId}`)
      return { success: false, error: 'Failed to update appliance' }
    }

    await refreshApplianceStatus(db, applianceId, logger)

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
