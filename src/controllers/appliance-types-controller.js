/**
 * Get appliance types filtered by isPrimary flag
 * @param {Db} db - MongoDB database instance
 * @param {Object} logger - Logger instance
 * @param {boolean|null} isPrimary - Filter by isPrimary flag (null = no filter)
 * @returns {Promise<Array>} Array of appliance types
 */
export async function getApplianceTypes(db, logger, isPrimary = null) {
  try {
    const query = isPrimary !== null ? { isPrimary } : {}

    const applianceTypes = await db
      .collection('ApplianceTypes')
      .find(query)
      .toArray()

    if (!applianceTypes || applianceTypes.length === 0) {
      logger.warn(`No appliance types found (isPrimary: ${isPrimary})`)
      return []
    }

    return applianceTypes
  } catch (error) {
    logger.error(error, 'Failed to fetch appliance types')
    throw error
  }
}
