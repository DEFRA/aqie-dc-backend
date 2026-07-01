import { createLogger } from '../common/helpers/logging/logger.js'
import {
  generateSecureId,
  findCertified,
  findLastUpdatedDate,
  getFullAddress
} from '../common/helpers/data-transformer.js'
/**
 * Fuels Controller
 * Business logic for fuel-related operations
 */

//Note: This is the orginal code extracted, needs to be compared to Ulys code and refactored/reviewed
const logger = createLogger()

/**
 * Create a new fuel
 */
async function createFuel(db, item) {
  if (!db) {
    throw new Error('db is required')
  }
  if (!item) {
    throw new Error('item is required')
  }

  try {
    const collection = db.collection('Fuel')

    const now = new Date()

    // Build fuel document
    const fuel = {
      ...item,
      fuelId: item.fuelId || `FUEL-${generateSecureId()}`,
      createdAt: item.createdAt || now,
      updatedAt: now
    }

    // Insert into database
    const result = await collection.insertOne(fuel)

    if (!result.acknowledged) {
      throw new Error('Failed to insert fuel')
    }

    logger.info(`Fuel created: ${fuel.fuelId}`)

    return {
      success: true,
      message: 'Fuel created successfully',
      data: fuel,
      _id: result.insertedId
    }
  } catch (error) {
    logger.error(error, 'Failed to create fuel')
    throw error
  }
}

// --- Mapping helpers ---
// Returns full detail object for single item views
function mapFuelDetail(item) {
  return {
    ...item,
    authorisedIn: findCertified(
      item.englandApproval,
      item.scotlandApproval,
      item.walesApproval,
      item.nIrelandApproval
    ),
    lastUpdatedDate: findLastUpdatedDate(
      item.englandUpdatedDate,
      item.scotlandUpdatedDate,
      item.walesUpdatedDate,
      item.nIrelandUpdatedDate
    ),
    name: item.brandNames || '',
    id: item.fuelId,
    manufacturer: item.companyName || '',
    fullAddress: getFullAddress(item)
  }
}

// Returns summary object for list views
function mapFuelSummary(item) {
  return {
    name: item.brandNames || '',
    id: item.fuelId,
    manufacturer: item.companyName || '',
    authorisedIn: findCertified(
      item.englandApproval,
      item.scotlandApproval,
      item.walesApproval,
      item.nIrelandApproval
    ),
    lastUpdatedDate: findLastUpdatedDate(
      item.englandUpdatedDate,
      item.scotlandUpdatedDate,
      item.walesUpdatedDate,
      item.nIrelandUpdatedDate
    )
  }
}

//async function getAllFuel(db, type) {
async function findAllFuel(db) {
  const collection = db.collection('Fuel') //TODOD: Change once refactor all
  const items = (await collection.find({}).toArray()).filter(
    (item) =>
      item.technicalApproval === 'Certified' &&
      [
        item.englandApproval,
        item.scotlandApproval,
        item.walesApproval,
        item.nIrelandApproval
      ].includes('Certified')
  )
  return items.map((item) => mapFuelSummary(item))
}

/**
 * Find a single fuel by ID
 */
async function findFuel(db, fuelId) {
  const collection = db.collection('Fuel')
  const item = await collection.findOne({ fuelId })
  if (!item) {
    return null
  }
  return mapFuelDetail(item)
}

/**
 * Update a fuel
 */
async function updateFuel(db, fuelId, updates) {
  try {
    const collection = db.collection('Fuel')
    const now = new Date()
    const result = await collection.updateOne(
      { fuelId },
      { $set: { ...updates, updatedAt: now } }
    )
    if (result.matchedCount === 0) {
      return { notFound: true }
    }
    const updated = await collection.findOne({ fuelId })
    return { updated }
  } catch (error) {
    logger.error(error, 'Failed to update fuel')
    throw error
  }
}

/**
 * Delete a fuel
 */
async function deleteFuel(db, fuelId) {
  try {
    const collection = db.collection('Fuel')
    const result = await collection.deleteOne({ fuelId })
    if (result.deletedCount === 0) {
      return { notFound: true }
    }
    return { deleted: true }
  } catch (error) {
    logger.error(error, 'Failed to delete fuel')
    throw error
  }
}

export { createFuel, findAllFuel, findFuel, updateFuel, deleteFuel }
