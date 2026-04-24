import { createLogger } from '../common/helpers/logging/logger.js'
import { generateSecureId, findCertified } from '../common/helpers/db-utils.js'
/**
 * Appliances Controller
 * Business logic for appliance-related operations
 */

//NOTE: this code has been moved from db-service, needs refactoring
const logger = createLogger()

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

// --- Mapping helpers ---
// Returns full detail object for single item views
// function mapApplianceDetail(item) {
//   return {
//     ...item,
//     authorisedIn: findCertified(
//       item.englandApproval,
//       item.scotlandApproval,
//       item.walesApproval,
//       item.nIrelandApproval
//     ),
//     name: item.modelName || '',
//     id: item.applianceId || '',
//     fullAddress: getFullAddress(item)
//   }
// }

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
async function findAllAppliance(db, type) {
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

export { createAppliance, findAllAppliance }
