import {
  generateSecureId,
  findCertified,
  getFullAddress
} from '../common/helpers/data-transformer.js'

/**
 * Appliances Controller
 * Business logic for appliance-related operations
 * Refactored to match appliances-controller patterns: parameter-based logger, consistent responses, pagination
 */

/**
 * Create a new appliance
 */
async function createAppliance(db, item, logger) {
  if (!db) {
    throw new Error('db is required')
  }
  if (!item) {
    throw new Error('item is required')
  }
  if (!logger) {
    throw new Error('logger is required')
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
      applicationId: item.applicationId || null
    }

    // Insert into database
    const result = await collection.insertOne(appliance)

    if (!result.acknowledged) {
      throw new Error('Failed to insert appliance')
    }

    logger.info(`Appliance created: ${appliance.applianceId}`)

    return {
      success: true,
      data: appliance
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

/**
 * Get all appliances with pagination
 * Returns only certified appliances per business requirements
 */
async function getAllAppliances(db, { page = 1, limit = 20 } = {}, logger) {
  try {
    const collection = db.collection('Appliance')
    // TODO: DECISION REQUIRED - Should we implement pagination for appliances?
    // Currently disabled to return all certified appliances. Enable pagination by uncommenting below:
    // const skip = (page - 1) * limit
    // .skip(skip)
    // .limit(limit)
    // And uncomment pagination object in return statement

    // Get all certified appliances (pagination disabled)
    const certificationFilter = {
      technicalApproval: 'Certified',
      $or: [
        { englandApproval: 'Certified' },
        { scotlandApproval: 'Certified' },
        { walesApproval: 'Certified' },
        { nIrelandApproval: 'Certified' }
      ]
    }

    const appliances = await collection
      .find(certificationFilter)
      .sort({ createdAt: -1 })
      // .skip(skip)        // PAGINATION: Uncomment if needed
      // .limit(limit)      // PAGINATION: Uncomment if needed
      .toArray()

    const total = await collection.countDocuments(certificationFilter)

    return {
      success: true,
      data: appliances.map((item) => mapApplianceSummary(item))
      // TODO: Pagination info - uncomment when pagination is decided
      // pagination: {
      //   page,
      //   limit,
      //   total,
      //   totalPages: Math.ceil(total / limit)
      // }
    }
  } catch (error) {
    if (logger) {
      logger.error(error, 'Failed to fetch appliances')
    }
    throw error
  }
}

/**
 * Get a single appliance by ID
 */
async function getApplianceById(db, applianceId, logger) {
  try {
    const collection = db.collection('Appliance')
    const item = await collection.findOne({ applianceId })

    if (!item) {
      return {
        success: false,
        message: 'Appliance not found',
        notFound: true
      }
    }

    return {
      success: true,
      data: mapApplianceDetail(item)
    }
  } catch (error) {
    if (logger) {
      logger.error(error, 'Failed to fetch appliance')
    }
    throw error
  }
}

/**
 * Update an appliance
 */
async function updateAppliance(db, applianceId, updates, logger) {
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
    if (logger) {
      logger.info(`Appliance updated: ${applianceId}`)
    }

    return { updated }
  } catch (error) {
    if (logger) {
      logger.error(error, 'Failed to update appliance')
    }
    throw error
  }
}

/**
 * Delete an appliance
 */
async function deleteAppliance(db, applianceId, logger) {
  try {
    const collection = db.collection('Appliance')
    const result = await collection.deleteOne({ applianceId })

    if (result.deletedCount === 0) {
      return { notFound: true }
    }

    if (logger) {
      logger.info(`Appliance deleted: ${applianceId}`)
    }

    return { deleted: true }
  } catch (error) {
    if (logger) {
      logger.error(error, 'Failed to delete appliance')
    }
    throw error
  }
}

// /**
//  * Get appliance with all applications? dont think this is needed, will be other way around?
//  */
// async function getApplianceWithUsers(db, applianceId, logger) {
//   try {
//     const appliance = await db.collection('Appliances').findOne({ applianceId })

//     if (!appliance) {
//       return {
//         success: false,
//         message: 'Appliance not found',
//         notFound: true
//       }
//     }

//     // Get all users who have this appliance
//     const userAppliances = await db
//       .collection('UserAppliances')
//       .find({ applianceId })
//       .toArray()

//     const userIds = userAppliances.map((ua) => ua.userId)
//     const users =
//       userIds.length > 0
//         ? await db
//             .collection('Users')
//             .find({ userId: { $in: userIds } })
//             .toArray()
//         : []

//     // Combine user data with user-appliance relationships
//     const usersWithRelations = users.map((user) => {
//       const userAppliance = userAppliances.find(
//         (ua) => ua.userId === user.userId
//       )
//       return {
//         ...user,
//         ...userAppliance
//       }
//     })

//     return {
//       success: true,
//       data: {
//         appliance,
//         users: usersWithRelations
//       }
//     }
//   } catch (error) {
//     if (logger) {
//       logger.error(error, 'Failed to fetch appliance with users')
//     }
//     throw error
//   }
// }

// /**
//  * Search appliances by name or type
//  */
// async function searchAppliances(db, { query, page = 1, limit = 20 }, logger) {
//   try {
//     const collection = db.collection('Appliances')
//     const skip = (page - 1) * limit

//     const searchQuery = {
//       $or: [
//         { name: { $regex: query, $options: 'i' } },
//         { type: { $regex: query, $options: 'i' } }
//       ]
//     }

//     const appliances = await collection
//       .find(searchQuery)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .toArray()

//     const total = await collection.countDocuments(searchQuery)

//     return {
//       success: true,
//       data: appliances,
//       pagination: {
//         page,
//         limit,
//         total,
//         totalPages: Math.ceil(total / limit)
//       }
//     }
//   } catch (error) {
//     if (logger) {
//       logger.error(error, 'Failed to search appliances')
//     }
//     throw error
//   }
// }

export {
  createAppliance,
  getAllAppliances,
  getApplianceById,
  updateAppliance,
  deleteAppliance
  //getApplianceWithApplications,
  //searchAppliances
}
