import {
  generateSecureId,
  getFullAddress,
  toDotted
} from '../common/helpers/data-transformer.js'
import {
  findCertified,
  findLastCertifiedDate
} from '../common/helpers/certification.js'
/**
 * Fuels Controller
 * Business logic for fuel-related operations
 */

const LOGGER_REQUIRED_ERROR = 'logger is required'

/**
 * Create a new fuel
 */
async function createFuel(db, item, logger) {
  if (!db) {
    throw new Error('db is required')
  }
  if (!item) {
    throw new Error('item is required')
  }
  if (!logger) {
    throw new Error(LOGGER_REQUIRED_ERROR)
  }
  try {
    const collection = db.collection('Fuels')

    const now = new Date()

    // Build fuel document
    const fuel = {
      ...item,
      id: item.id || `FUEL-${generateSecureId()}`,
      createdAt: item.createdAt || now,
      updatedAt: now
    }

    // Insert into database
    const result = await collection.insertOne(fuel)

    if (!result.acknowledged) {
      throw new Error('Failed to insert fuel')
    }

    logger.info(`Fuel created: ${fuel.id}`)

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
    authorisedIn: findCertified(item),
    lastUpdatedDate: findLastCertifiedDate(item),
    name: item.brandNames || '',
    id: item.id,
    manufacturer: item.companyName || '',
    fullAddress: getFullAddress(item)
  }
}

// Returns summary object for list views
function mapFuelSummary(item) {
  return {
    name: item.brandNames || '',
    id: item.id,
    manufacturer: item.companyName || '',
    authorisedIn: findCertified(item),
    lastUpdatedDate: findLastCertifiedDate(item)
  }
}

//async function getAllFuel(db, type) {
async function getAllFuels(db, logger) {
  if (!logger) {
    throw new Error(LOGGER_REQUIRED_ERROR)
  }
  try {
    const collection = db.collection('Fuels')

    // Visibility is derived from review and certification outcomes when a
    // fuel's status is calculated, so it is the only condition needed here.
    const fuels = await collection
      .find({ isVisibleToPublic: true })
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
    throw new Error(LOGGER_REQUIRED_ERROR)
  }
  try {
    const collection = db.collection('Fuels')
    const item = await collection.findOne({ id: fuelId })

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
    throw new Error(LOGGER_REQUIRED_ERROR)
  }
  try {
    const collection = db.collection('Fuels')
    const now = new Date()
    const result = await collection.updateOne(
      { id: fuelId },
      { $set: { ...toDotted(updates), updatedAt: now } }
    )
    if (result.matchedCount === 0) {
      return { notFound: true }
    }
    const updated = await collection.findOne({ id: fuelId })
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
    throw new Error(LOGGER_REQUIRED_ERROR)
  }
  try {
    const collection = db.collection('Fuels')
    const result = await collection.deleteOne({ id: fuelId })
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
async function getAllFuelsWithPagination(
  db,
  { page = 1, limit = 20 } = {},
  logger
) {
  if (!logger) {
    throw new Error(LOGGER_REQUIRED_ERROR)
  }
  try {
    const collection = db.collection('Fuels')
    const skip = (page - 1) * limit

    const fuels = await collection
      .find({ isVisibleToPublic: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const total = await collection.countDocuments({ isVisibleToPublic: true })

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
    throw new Error(LOGGER_REQUIRED_ERROR)
  }
  try {
    const collection = db.collection('Fuels')
    const skip = (page - 1) * limit

    const searchQuery = {
      $or: [
        { brandNames: { $regex: query, $options: 'i' } },
        { companyName: { $regex: query, $options: 'i' } },
        { resellBrandName: { $regex: query, $options: 'i' } }
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
      data: fuels.map((item) => mapFuelSummary(item)),
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
    throw new Error(LOGGER_REQUIRED_ERROR)
  }
  try {
    // Get fuel
    const fuel = await db.collection('Fuels').findOne({ id: fuelId })

    if (!fuel) {
      return {
        success: false,
        message: 'Fuel not found',
        notFound: true
      }
    }

    return {
      success: true,
      data: mapFuelDetail(fuel)
    }
  } catch (error) {
    logger.error(error, 'Failed to fetch fuel with related items')
    throw error
  }
}

export {
  createFuel,
  getAllFuels,
  getFuelById,
  updateFuel,
  deleteFuel,
  getAllFuelsWithPagination,
  searchFuels,
  getFuelWithRelatedItems
}
