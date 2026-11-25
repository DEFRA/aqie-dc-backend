import {
  generateNextId,
  getFullAddress,
  toDotted
} from '../common/helpers/data-transformer.js'
import { REVIEWED_STATUSES } from '../common/helpers/review-status.js'
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

    // Generate ID if not provided, using chronological sequence
    let id = item.id
    if (!id) {
      const lastFuel = await collection.findOne(
        { id: { $regex: /^\d{4}-\d+$/ } },
        { sort: { _id: -1 }, projection: { id: 1 } }
      )
      id = generateNextId(lastFuel?.id)
    }

    // Build fuel document
    const fuel = {
      ...item,
      id,
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
    name: item.brandName,
    id: item.id,
    manufacturer: item.companyName,
    fullAddress: getFullAddress(item)
  }
}

// Returns summary object for list views
function mapFuelSummary(item) {
  return {
    name: item.brandName,
    id: item.id,
    manufacturer: item.companyName,
    authorisedIn: findCertified(item),
    lastUpdatedDate: findLastCertifiedDate(item)
  }
}

async function getAllFuels(db, logger) {
  if (!logger) {
    throw new Error(LOGGER_REQUIRED_ERROR)
  }
  try {
    const collection = db.collection('Fuels')

    // Visibility is derived from review and certification outcomes when a
    // fuel's status is calculated, so it is the only condition needed here.
    const fuels = await collection.find({ isVisibleToPublic: true }).toArray()

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
 * Admin: list and search fuels by brand name or ID with status filtering and pagination
 */
async function getAdminFuels(
  db,
  { query = '', page = 1, limit = 20, statuses = [] } = {},
  logger
) {
  if (!logger) {
    throw new Error(LOGGER_REQUIRED_ERROR)
  }
  try {
    const collection = db.collection('Fuels')
    const skip = (page - 1) * limit
    const normalisedStatuses = (statuses || [])
      .map((status) => (status || '').toLowerCase().trim())
      .filter(Boolean)

    // Only return fuels whose technical review has reached a final status
    const searchQuery = {
      'technicalReview.status': { $in: REVIEWED_STATUSES }
    }

    // Fuels stay out of the list until their application is submitted.
    // Records with no application (legacy imports) are not affected.
    const unfinishedApplications = await db
      .collection('Applications')
      .find({ status: { $ne: 'complete' } }, { projection: { id: 1, _id: 0 } })
      .toArray()

    if (unfinishedApplications.length > 0) {
      searchQuery.applicationId = {
        $nin: unfinishedApplications.map(({ id }) => id)
      }
    }

    if (query?.trim()) {
      const trimmedQuery = query.trim()
      searchQuery.$or = [
        { brandName: { $regex: trimmedQuery, $options: 'i' } },
        { additionalBrandNames: { $regex: trimmedQuery, $options: 'i' } },
        { id: { $regex: trimmedQuery, $options: 'i' } }
      ]
    }

    if (normalisedStatuses.length > 0) {
      searchQuery.fuelStatus = {
        $in: normalisedStatuses.map((status) => new RegExp(`^${status}$`, 'i'))
      }
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
      data: fuels.map((item) => ({
        id: item.id || '',
        brandName: item.brandName || '',
        status: item.fuelStatus || 'pending'
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 0)
      }
    }
  } catch (error) {
    logger.error(error, 'Failed to fetch admin fuels')
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
    // PATCH validation skips schema defaults, so derive the flag here.
    const changes =
      'additionalBrandNames' in updates &&
      !('hasAdditionalBrandNames' in updates)
        ? {
            ...updates,
            hasAdditionalBrandNames: Boolean(
              updates.additionalBrandNames?.trim()
            )
          }
        : updates
    // Dotted $set cannot create sub-fields inside a stored null (e.g. fuelDescription on a rebrand).
    for (const [key, value] of Object.entries(changes)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        await collection.updateOne(
          { id: fuelId, [key]: null },
          { $set: { [key]: {} } }
        )
      }
    }
    const result = await collection.updateOne(
      { id: fuelId },
      { $set: { ...toDotted(changes), updatedAt: now } }
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

export {
  createFuel,
  getAllFuels,
  getAdminFuels,
  getFuelById,
  updateFuel,
  deleteFuel
}
