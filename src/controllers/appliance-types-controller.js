const LOGGER_REQUIRED_ERROR =
  'Appliance types controller requires a logger instance'

/**
 * Get all appliance types with optional filtering
 * @param {Db} db - MongoDB database instance
 * @param {Object} options - Query options
 * @param {boolean} options.isPrimary - Optional filter for isPrimary flag
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object>} Success response with appliance types array
 */
export async function getApplianceTypes(db, { isPrimary = null } = {}, logger) {
  if (!logger) {
    throw new Error(LOGGER_REQUIRED_ERROR)
  }

  try {
    const query = isPrimary !== null ? { isPrimary } : {}

    const applianceTypes = await db
      .collection('ApplianceTypes')
      .find(query)
      .toArray()

    const filterInfo = isPrimary !== null ? ` (isPrimary: ${isPrimary})` : ''

    if (!applianceTypes || applianceTypes.length === 0) {
      logger.info(`No appliance types found${filterInfo}`)
      return {
        success: true,
        data: []
      }
    }

    logger.info(`Found ${applianceTypes.length} appliance type(s)${filterInfo}`)

    return {
      success: true,
      data: applianceTypes
    }
  } catch (error) {
    logger.error(error, 'Failed to fetch appliance types')
    throw error
  }
}
