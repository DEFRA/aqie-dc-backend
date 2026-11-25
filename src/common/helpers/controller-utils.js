/**
 * Common controller utilities and constants
 * Shared across all controller modules
 */

const LOGGER_REQUIRED_ERROR = 'logger is required'
const APPLICATION_NOT_FOUND = 'Application not found'
const APPLIANCE_NOT_FOUND = 'Appliance not found'
const FUEL_NOT_FOUND = 'Fuel not found'
const MONGO_ILLEGAL_OPERATION_CODE = 20
const ID_PATTERN = /^\d{4}-\d+$/

function ensureLogger(logger) {
  if (!logger) {
    throw new Error(LOGGER_REQUIRED_ERROR)
  }
}

async function getCompleteApplicationIds(db) {
  const completeApplications = await db
    .collection('Applications')
    .find({ status: 'complete' })
    .project({ id: 1, _id: 0 })
    .toArray()

  return completeApplications.map((app) => app.id).filter(Boolean)
}

const escapeRegex = (value) =>
  String(value).replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)

export {
  ensureLogger,
  escapeRegex,
  getCompleteApplicationIds,
  LOGGER_REQUIRED_ERROR,
  APPLICATION_NOT_FOUND,
  APPLIANCE_NOT_FOUND,
  FUEL_NOT_FOUND,
  MONGO_ILLEGAL_OPERATION_CODE,
  ID_PATTERN
}
