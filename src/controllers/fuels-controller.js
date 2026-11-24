import {
  generateNextId,
  getFullAddress,
  toDotted
} from '../common/helpers/data-transformer.js'
import {
  findCertified,
  findLastCertifiedDate
} from '../common/helpers/certification.js'
import {
  ensureLogger,
  escapeRegex
} from '../common/helpers/controller-utils.js'

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
  }
  ensureLogger(logger)
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
// Returns summary object for list views
function mapFuelSummary(item) {
  return {
    id: item.id,
    name: item.brandName,
    companyName: item.companyName,
    certifiedCountries: findCertified(item),
    lastUpdatedDate: findLastCertifiedDate(item)
  }
}

/**
 * Get live fuels, optionally searched by brand/company name.
 * Paginated when `limit` is given; otherwise returns every match.
 */
async function getAllFuels(db, { query = '', page = 1, limit } = {}, logger) {
  ensureLogger(logger)
  try {
    const collection = db.collection('Fuels')

    // The overall status already reflects review, certification and visibility, so
    // 'live' is the only status condition needed here.
    const conditions = [{ fuelStatus: 'live' }]
    if (query) {
      const regex = { $regex: escapeRegex(query), $options: 'i' }
      conditions.push({
        $or: [
          { brandName: regex },
          { additionalBrandNames: regex },
          { companyName: regex }
        ]
      })
    }
    const searchQuery = { $and: conditions }
    const cursor = collection.find(searchQuery).sort({ createdAt: -1 })

    if (!limit) {
      const fuels = await cursor.toArray()
      return {
        success: true,
        data: fuels.map((item) => mapFuelSummary(item))
      }
    }

    const [fuels, total] = await Promise.all([
      cursor
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      collection.countDocuments(searchQuery)
    ])

    return {
      success: true,
      data: fuels.map((item) => mapFuelSummary(item)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    }
  } catch (error) {
    logger.error(error, 'Failed to fetch fuels')
    throw error
  }
}

/**
 * Public: get a single live fuel by ID (non-live is treated as not found)
 */
async function getFuelById(db, fuelId, logger) {
  ensureLogger(logger)
  try {
    const collection = db.collection('Fuels')
    const item = await collection.findOne({ id: fuelId, fuelStatus: 'live' })

    if (!item) {
      return {
        success: false,
        message: 'Fuel not found',
        notFound: true
      }
    }

    return {
      success: true,
      data: {
        ...item,
        certifiedCountries: findCertified(item),
        lastUpdatedDate: findLastCertifiedDate(item),
        name: item.brandName,
        fullAddress: getFullAddress(item)
      }
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
  ensureLogger(logger)
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
  ensureLogger(logger)
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

export { createFuel, getAllFuels, getFuelById, updateFuel, deleteFuel }
