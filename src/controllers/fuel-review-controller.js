import { updateFuel } from './fuels-controller.js'

/**
 * Fuel Review Controller
 * Business logic for the technical review of a fuel
 */

const LOGGER_REQUIRED_ERROR = 'logger is required'
const FUEL_NOT_FOUND = 'Fuel not found'

/**
 * Record the reviewer's decision on a fuel.
 */
async function updateFuelReview(db, fuelId, decision, logger) {
  if (!logger) {
    throw new Error(LOGGER_REQUIRED_ERROR)
  }
  try {
    const { status, reviewedBy } = decision
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
      return { success: false, message: FUEL_NOT_FOUND, notFound: true }
    }

    logger.info(`Fuel review ${status}: ${fuelId}`)

    // Only the decision is returned; the full record carries company contact details.
    return { success: true, data: { fuelId, status, reviewedAt } }
  } catch (error) {
    logger.error(error, 'Failed to update fuel review')
    throw error
  }
}

export { updateFuelReview }
