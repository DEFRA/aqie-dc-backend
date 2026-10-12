import Boom from '@hapi/boom'

// Map of country codes to certification field names
const countryToCertificationField = {
  england: 'englandCertification',
  scotland: 'scotlandCertification',
  wales: 'walesCertification',
  'northern-ireland': 'nIrelandCertification'
}

/**
 * Validate status transition is allowed
 * @param {string} currentStatus - Current certification status
 * @param {string} newStatus - Requested new status
 * @returns {boolean} Whether transition is allowed
 */
const isValidStatusTransition = (currentStatus, newStatus) => {
  // Map user-facing "uncertified" to schema "revoked"
  const normalizedNewStatus = newStatus === 'uncertified' ? 'revoked' : newStatus

  const allowedTransitions = {
    new: ['awaiting_decision', 'certified', 'revoked', 'rejected'],
    awaiting_decision: ['certified', 'revoked', 'rejected'],
    certified: ['revoked'], // Can only revoke a certified status
    revoked: ['certified'], // Can only re-certify a revoked status
    rejected: [] // Terminal state, no transitions
  }

  return allowedTransitions[currentStatus]?.includes(normalizedNewStatus) ?? false
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
    // Validate country
    if (!countryToCertificationField[country]) {
      logger.warn(
        `Invalid country code: ${country}`,
        { applianceId, requestedCountry: country }
      )
      return {
        success: false,
        error: `Invalid country: ${country}. Must be one of: england, scotland, wales, northern-ireland`
      }
    }

    const certificationField = countryToCertificationField[country]

    // Fetch appliance
    const appliancesCollection = db.collection('Appliances')
    const appliance = await appliancesCollection.findOne({ id: applianceId })

    if (!appliance) {
      logger.warn(`Appliance not found: ${applianceId}`)
      return { success: false, error: `Appliance not found: ${applianceId}` }
    }

    // Get current status
    const currentCertification = appliance[certificationField] || {}
    const currentStatus = currentCertification.status || 'new'

    // Validate status transition
    if (!isValidStatusTransition(currentStatus, newStatus)) {
      logger.warn(
        `Invalid status transition: ${currentStatus} → ${newStatus}`,
        { applianceId, country, currentStatus, requestedStatus: newStatus }
      )
      return {
        success: false,
        error: `Cannot change status from ${currentStatus} to ${newStatus}`
      }
    }

    // Normalize status (user-facing "uncertified" → schema "revoked")
    const normalizedStatus = newStatus === 'uncertified' ? 'revoked' : newStatus

    // Build update object
    const now = new Date()
    const updateData = {
      [certificationField]: {
        status: normalizedStatus,
        decidedAt: now,
        decidedBy
      }
    }

    // Update historical milestones
    if (normalizedStatus === 'certified') {
      // Set firstCertifiedAt only on first certification
      if (!currentCertification.firstCertifiedAt) {
        updateData[`${certificationField}.firstCertifiedAt`] = now
      }
      // Always update lastCertifiedAt when certified
      updateData[`${certificationField}.lastCertifiedAt`] = now
    }

    // Update appliance
    updateData.updatedAt = now

    const result = await appliancesCollection.findOneAndUpdate(
      { id: applianceId },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    if (!result.value) {
      logger.error(`Failed to update appliance: ${applianceId}`)
      return { success: false, error: 'Failed to update appliance' }
    }

    logger.info(
      `Certification status updated: ${applianceId} (${country}: ${currentStatus} → ${normalizedStatus})`,
      { applianceId, country, oldStatus: currentStatus, newStatus: normalizedStatus }
    )

    return { success: true, data: result.value }
  } catch (error) {
    logger.error(`Error updating certification status: ${error.message}`, {
      applianceId,
      country,
      newStatus,
      error: error.toString()
    })
    return { success: false, error: 'Internal server error' }
  }
}
