import { createLogger } from '../common/helpers/logging/logger.js'
import { generateSecureId, findCertified } from '../common/helpers/db-utils.js'
/**
 * Fuels Controller
 * Business logic for fuel-related operations
 */

//NOTE: this code has been moved from db-service, needs refactoring
const logger = createLogger()

/**
 * Create a new fuel
 */
//async function createFuel(db, payload, logger) {
async function createFuel(db, type, item) {
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

    // Build fuel document
    const fuel = {
      ...item,
      createdAt: item.createdAt || now,
      updatedAt: now
    }

    // Generate unique fuelId (UUID)
    if (type === 'appliance') {
      fuel.applianceId =
        fuel.applianceId || `APP-${generateSecureId()}`
    } else {
      fuel.fuelId = fuel.fuelId || `FUEL-${generateSecureId()}`
    }
    // Insert into database
    const result = await collection.insertOne(fuel)

    if (!result.insertedId) {
      throw new Error('Failed to insert fuel')
    }

    logger.info(`Fuel created: ${fuel.fuelId}`)

    return {
      success: true,
      message: 'Fuel created successfully',
      data: fuel
    }
  } catch (error) {
    logger.error(error, 'Failed to create fuel')
    throw error
  }
}

// --- Mapping helpers ---
// Returns full detail object for single item views
// function mapFuelDetail(item) {
//   return {
//     ...item,
//     authorisedIn: findCertified(
//       item.englandApproval,
//       item.scotlandApproval,
//       item.walesApproval,
//       item.nIrelandApproval
//     ),
//     name: item.modelName || '',
//     id: item.fuelId || '',
//     fullAddress: getFullAddress(item)
//   }
// }

// Returns summary object for list views
function mapFuelSummary(item) {
  return {
    name: item.modelName || '',
    id: item.fuelId || '',
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

//async function getAllFuel(db, type) {
async function findAllFuel(db, type) {
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

export { createFuel, findAllFuel }
