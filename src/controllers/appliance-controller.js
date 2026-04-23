import crypto from 'crypto'
import { createLogger } from './common/helpers/logging/logger.js'
/**
 * Appliances Controller
 * Business logic for appliance-related operations
 */
const logger = createLogger()
const generateSecureId = () => {
  return crypto
    .randomBytes(9)
    .toString('base64') // 12 chars but includes +=/
    .replace(/[^a-zA-Z0-9]/g, '') // remove symbols
    .slice(0, 12)
}

/**
 * Create a new appliance
 */
//async function createAppliance(db, payload, logger) {
async function createAppliance(db, type, item) {
  let collectionName
  if (type === 'appliance') {
    collectionName = 'Appliance' //TODO need to change once refactor all
  } else if (type === 'fuel') {
    collectionName = 'Fuel' //TODO need to change  once refactor all
  } else {
    throw new Error(`Unknown type: ${type}`)
  }

  try {
    const collection = db.collection(collectionName)

    const now = new Date()

    // Build appliance document
    const appliance = {
      ...item,
      createdAt: item.createdAt || now,
      updatedAt: now
    }

    // Generate unique applianceId (UUID)
    if (type === 'appliance') {
      appliance.applianceId =
        appliance.applianceId || `APP-${generateSecureId()}`
    } else {
      appliance.fuelId = appliance.fuelId || `FUEL-${generateSecureId()}`
    }
    // Insert into database
    const result = await collection.insertOne(appliance)

    if (!result.insertedId) {
      throw new Error('Failed to insert appliance')
    }

    logger.info(`Appliance created: ${appliance.applianceId}`)

    return {
      success: true,
      message: 'Appliance created successfully',
      data: appliance
    }
  } catch (error) {
    logger.error(error, 'Failed to create appliance')
    throw error
  }
}

export { createAppliance }
