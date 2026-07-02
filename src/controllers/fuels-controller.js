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

/**
 * Create a new fuel
 */
async function createFuel(db, item, logger) {
  if (!db) {
    throw new Error('db is required')
  }
  if (!item) {
    throw new Error('item is required')
  }  if (!logger) {
    throw new Error('logger is required')
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
async function getAllFuels(db, logger) {
  if (!logger) {
    throw new Error('logger is required')
  }
  try {
    const collection = db.collection('Fuel') //change once refactored to Fuels collection

    // Get all certified fuels
    const certificationFilter = {
      technicalApproval: 'Certified',
      $or: [
        { englandApproval: 'Certified' },
        { scotlandApproval: 'Certified' },
        { walesApproval: 'Certified' },
        { nIrelandApproval: 'Certified' }
      ]
    }

    const fuels = await collection
      .find(certificationFilter)
      // .sort({ createdAt: -1 }) //what is the sort order for fuels? maybe by name?
      .toArray()

    return {
      success: true,
      data: fuels.map((item) => mapFuelSummary(item))
    }
  } catch (error) {
    logger.error(error, 'Failed to fetch fuels')
    throw error
  }
}

/**
 * Find a single fuel by ID
 */
async function getFuelById(db, fuelId, logger) {
  if (!logger) {
    throw new Error('logger is required')
  }
  try {
    const collection = db.collection('Fuel')
    const item = await collection.findOne({ fuelId })

    if (!item) {
      return {
        success: false,
        message: 'Fuel not found',
        notFound: true
      }
    }

    return {
      success: true,
      data: mapFuelDetail(item)
    }
  } catch (error) {
    logger.error(error, 'Failed to fetch fuel')
    throw error
  }
}

/**
 * Update a fuel
 */
async function updateFuel(db, fuelId, updates, logger) {
  if (!logger) {
    throw new Error('logger is required')
  }
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
async function deleteFuel(db, fuelId, logger) {
  if (!logger) {
    throw new Error('logger is required')
  }
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

/**
 * Get all fuels with pagination
 * @deprecated not sure if pagniation is needed, if not can delete, if yes then replace with this
 */
async function getAllFuelsWithPagination(db, { page = 1, limit = 20 } = {}, logger) {
  if (!logger) {
    throw new Error('logger is required')
  }
  try {
    const collection = db.collection('Fuel')
    const skip = (page - 1) * limit

    // Get all certified fuels
    const certificationFilter = {
      technicalApproval: 'Certified',
      $or: [
        { englandApproval: 'Certified' },
        { scotlandApproval: 'Certified' },
        { walesApproval: 'Certified' },
        { nIrelandApproval: 'Certified' }
      ]
    }

    const fuels = await collection
      .find(certificationFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const total = await collection.countDocuments(certificationFilter)

    return {
      success: true,
      data: fuels.map((item) => mapFuelSummary(item)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) {
    logger.error(error, 'Failed to fetch fuels with pagination')
    throw error
  }
}

/**
 * Search fuels by name or type with pagination
 */
async function searchFuels(db, { query, page = 1, limit = 20 } = {}, logger) {
  if (!logger) {
    throw new Error('logger is required')
  }
  try {
    const collection = db.collection('Fuel')
    const skip = (page - 1) * limit

    const searchQuery = {
      $or: [
        { brandNames: { $regex: query, $options: 'i' } },
        { companyName: { $regex: query, $options: 'i' } },
        { fuelType: { $regex: query, $options: 'i' } }
      ]
    }

    const fuels = await collection
      .find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const total = await collection.countDocuments(searchQuery)

    return {
      success: true,
      data: fuels.map(item => mapFuelSummary(item)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) {
    logger.error(error, 'Failed to search fuels')
    throw error
  }
}
//not sure this is needed - maybe for future admin
/**
 * Get fuel with all users/applications that use it
 * @deprecated Relationship queries may need review for current schema
 */
async function getFuelWithRelatedItems(db, fuelId, logger) {
  if (!logger) {
    throw new Error('logger is required')
  }
  try {
    // Get fuel
    const fuel = await db.collection('Fuel').findOne({ fuelId })

    if (!fuel) {
      return {
        success: false,
        message: 'Fuel not found',
        notFound: true
      }
    }

    // TODO: Get related items (currently commented pending schema review) - now its applications not users
    // const userFuels = await db.collection('UserFuels').find({ fuelId }).toArray()
    // const userIds = userFuels.map((uf) => uf.userId)
    // const users = userIds.length > 0
    //   ? await db.collection('Users').find({ userId: { $in: userIds } }).toArray()
    //   : []

    return {
      success: true,
      data: mapFuelDetail(fuel)
    }
  } catch (error) {
    logger.error(error, 'Failed to fetch fuel with related items')
    throw error
  }
}

export { createFuel, getAllFuels, getFuelById, updateFuel, deleteFuel, getAllFuelsWithPagination, searchFuels, getFuelWithRelatedItems }
