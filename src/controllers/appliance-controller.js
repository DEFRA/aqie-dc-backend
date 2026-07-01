import { createLogger } from '../common/helpers/logging/logger.js'
import {
  generateSecureId,
  findCertified,
  getFullAddress
} from '../common/helpers/data-transformer.js'
/**
 * Appliances Controller
 * Business logic for appliance-related operations
 */

//Note: This is the original code extracted, needs to be compared to Ulys code and refactored/reviewed
const logger = createLogger()

/**
 * Create a new appliance
 */
async function createAppliance(db, item) {
  if (!db) {
    throw new Error('db is required')
  }
  if (!item) {
    throw new Error('item is required')
  }

  try {
    const collection = db.collection('Appliance')

    const now = new Date()

    // Build appliance document
    const appliance = {
      ...item,
      applianceId: item.applianceId || `APP-${generateSecureId()}`,
      createdAt: item.createdAt || now,
      updatedAt: now,
      applicationId: item.applicationId || null // Link to application so can add this in for testing
    }
    // Insert into database
    const result = await collection.insertOne(appliance)

    if (!result.acknowledged) {
      throw new Error('Failed to insert appliance')
    }

    logger.info(`Appliance created: ${appliance.applianceId}`)

    // TODO: DECISION REQUIRED - Keep or remove _id in response?
    // Currently returning MongoDB _id alongside applianceId
    // Pros: Allows _id-based lookups, standard REST pattern, flexibility
    // Cons: Redundant if only applianceId is used throughout API
    return {
      success: true,
      message: 'Appliance created successfully',
      data: appliance,
      _id: result.insertedId
    }
  } catch (error) {
    logger.error(error, 'Failed to create appliance')
    throw error
  }
}

// --- Mapping helpers ---
// Returns full detail object for single item views
function mapApplianceDetail(item) {
  return {
    ...item,
    authorisedIn: findCertified(
      item.englandApproval,
      item.scotlandApproval,
      item.walesApproval,
      item.nIrelandApproval
    ),
    name: item.modelName || '',
    id: item.applianceId || '',
    manufacturer: item.companyName || '',
    fullAddress: getFullAddress(item)
  }
}

// Returns summary object for list views
function mapApplianceSummary(item) {
  return {
    name: item.modelName || '',
    id: item.applianceId || '',
    manufacturer: item.companyName || '',
    fuels: Array.isArray(item.allowedFuels)
      ? item.allowedFuels.join(', ')
      : item.allowedFuels || '',
    type: item.applianceType,
    modelNumber: item.modelNumber,
    authorisedIn: findCertified(
      item.englandApproval,
      item.scotlandApproval,
      item.walesApproval,
      item.nIrelandApproval
    )
  }
}

//async function getAllAppliance(db, type) {
async function findAllAppliance(db) { //NEEDTO: rename to findAllAppliances once refactor all
  const collection = db.collection('Appliance') //TODOD: Change once refactor all
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
  return items.map((item) => mapApplianceSummary(item))
}

/**
 * Find a single appliance by ID
 */
async function findAppliance(db, applianceId) {
  const collection = db.collection('Appliance')
  const item = await collection.findOne({ applianceId })
  if (!item) {
    return null
  }
  return mapApplianceDetail(item)
}

/**
 * Update an appliance
 */
async function updateAppliance(db, applianceId, updates) {
  try {
    const collection = db.collection('Appliance')
    const now = new Date()
    const result = await collection.updateOne(
      { applianceId },
      { $set: { ...updates, updatedAt: now } }
    )
    if (result.matchedCount === 0) {
      return { notFound: true }
    }
    const updated = await collection.findOne({ applianceId })
    return { updated }
  } catch (error) {
    logger.error(error, 'Failed to update appliance')
    throw error
  }
}

/**
 * Delete an appliance
 */
async function deleteAppliance(db, applianceId) {
  try {
    const collection = db.collection('Appliance')
    const result = await collection.deleteOne({ applianceId })
    if (result.deletedCount === 0) {
      return { notFound: true }
    }
    return { deleted: true }
  } catch (error) {
    logger.error(error, 'Failed to delete appliance')
    throw error
  }
}

export {
  createAppliance,
  findAllAppliance,
  findAppliance,
  updateAppliance,
  deleteAppliance
}
