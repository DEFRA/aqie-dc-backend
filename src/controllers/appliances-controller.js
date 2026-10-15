import {
  generateSecureId,
  getFullAddress,
  toDotted
} from '../common/helpers/data-transformer.js'
import { REVIEWED_STATUSES } from '../common/helpers/review-status.js'
import {
  CERTIFICATION_FIELDS,
  findCertified,
  findNotYetNotifiedCountries,
  mapCertifications
} from '../common/helpers/certification.js'
import { calculateItemStatus } from '../common/helpers/item-status.js'

/**
 * Appliances Controller
 * Business logic for appliance-related operations
 */

const LOGGER_REQUIRED_ERROR = 'logger is required'
const APPLIANCE_NOT_FOUND = 'Appliance not found'

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
    throw new Error(LOGGER_REQUIRED_ERROR)
  }
  try {
    const collection = db.collection('Appliances')

    const now = new Date()

    // Build appliance document
    const appliance = {
      ...item,
      id: item.id || `APP-${generateSecureId()}`,
      applicationId: item.applicationId || null,
      createdAt: item.createdAt || now,
      updatedAt: now
    }

    // Insert into database
    const result = await collection.insertOne(appliance)

    if (!result.acknowledged) {
      throw new Error('Failed to insert appliance')
    }

    logger.info(`Appliance created: ${appliance.id}`)

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
    authorisedIn: findCertified(item),
    name: item.modelName || '',
    id: item.id || '',
    manufacturer: item.companyName || '',
    fullAddress: getFullAddress(item)
  }
}

// Returns summary object for list views
function mapApplianceSummary(item) {
  return {
    name: item.modelName || '',
    id: item.id || '',
    manufacturer: item.companyName || '',
    permittedFuels: item.permittedFuels || '',
    type: item.applianceType,
    modelNumber: item.modelNumber,
    authorisedIn: findCertified(item)
  }
}

/**
 * Get all appliances (pagination not currently supported)
 * Returns only certified appliances per business requirements
 */
async function getAllAppliances(db, _options, logger) {
  if (!logger) {
    throw new Error(LOGGER_REQUIRED_ERROR)
  }
  try {
    const collection = db.collection('Appliances')

    // Visibility is derived from review and certification outcomes when an
    // appliance's status is calculated, so it is the only condition needed here.
    const appliances = await collection
      .find({ isVisibleToPublic: true })
      .sort({ createdAt: -1 })
      .toArray()

    return {
      success: true,
      data: appliances.map((item) => mapApplianceSummary(item))
    }
  } catch (error) {
    logger.error(error, 'Failed to fetch appliances')
    throw error
  }
}

/**
 * Get a single appliance by ID
 */
async function getApplianceById(db, id, logger) {
  if (!logger) {
    throw new Error(LOGGER_REQUIRED_ERROR)
  }
  try {
    const collection = db.collection('Appliances')
    const item = await collection.findOne({ id })

    if (!item) {
      return {
        success: false,
        message: APPLIANCE_NOT_FOUND,
        notFound: true
      }
    }

    return {
      success: true,
      data: mapApplianceDetail(item)
    }
  } catch (error) {
    logger.error(error, 'Failed to fetch appliance')
    throw error
  }
}

/**
 * Update an appliance
 */
async function updateAppliance(db, id, updates, logger) {
  if (!logger) {
    throw new Error(LOGGER_REQUIRED_ERROR)
  }
  try {
    const collection = db.collection('Appliances')
    const now = new Date()

    const result = await collection.updateOne(
      { id },
      { $set: { ...toDotted(updates), updatedAt: now } }
    )

    if (result.matchedCount === 0) {
      return { notFound: true }
    }

    const updated = await collection.findOne({ id })
    logger.info(`Appliance updated: ${id}`)

    return { updated }
  } catch (error) {
    logger.error(error, 'Failed to update appliance')
    throw error
  }
}

/**
 * Delete an appliance
 */
async function deleteAppliance(db, id, logger) {
  if (!logger) {
    throw new Error(LOGGER_REQUIRED_ERROR)
  }
  try {
    const collection = db.collection('Appliances')
    const result = await collection.deleteOne({ id })

    if (result.deletedCount === 0) {
      return { notFound: true }
    }

    logger.info(`Appliance deleted: ${id}`)

    return { deleted: true }
  } catch (error) {
    logger.error(error, 'Failed to delete appliance')
    throw error
  }
}

/**
 * Admin: search appliances by name, model number, or type with pagination
 */
async function searchAdminAppliances(
  db,
  { query = '', page = 1, limit = 20, statuses = [] } = {},
  logger
) {
  if (!logger) {
    throw new Error(LOGGER_REQUIRED_ERROR)
  }
  try {
    const collection = db.collection('Appliances')
    const skip = (page - 1) * limit
    const normalisedStatuses = (statuses || [])
      .map((status) => (status || '').toLowerCase().trim())
      .filter(Boolean)

    // Only return appliances whose technical review has reached a final status
    const searchQuery = {
      'technicalReview.status': { $in: REVIEWED_STATUSES }
    }

    if (query?.trim()) {
      const trimmedQuery = query.trim()
      searchQuery.$or = [
        { modelName: { $regex: trimmedQuery, $options: 'i' } },
        { companyName: { $regex: trimmedQuery, $options: 'i' } },
        { modelNumber: { $regex: trimmedQuery, $options: 'i' } },
        { applianceType: { $regex: trimmedQuery, $options: 'i' } }
      ]
    }

    if (normalisedStatuses.length > 0) {
      searchQuery.applianceStatus = {
        $in: normalisedStatuses.map((status) => new RegExp(`^${status}$`, 'i'))
      }
    }

    const appliances = await collection
      .find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const total = await collection.countDocuments(searchQuery)

    return {
      success: true,
      data: appliances.map((item) => ({
        id: item.id || '',
        name: item.modelName || '',
        status: item.applianceStatus || 'pending'
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 0)
      }
    }
  } catch (error) {
    logger.error(error, 'Failed to search admin appliances')
    throw error
  }
}

/**
 * Admin: get a single appliance record for the admin frontend
 */
async function getAdminApplianceById(db, id, logger) {
  if (!logger) {
    throw new Error(LOGGER_REQUIRED_ERROR)
  }
  try {
    const item = await db.collection('Appliances').findOne(
      { id },
      {
        projection: {
          _id: 0,
          id: 1,
          modelName: 1,
          modelNumber: 1,
          applicationId: 1,
          isLegacyRecord: 1,
          isVisibleToPublic: 1,
          englandCertification: 1,
          scotlandCertification: 1,
          walesCertification: 1,
          nIrelandCertification: 1,
          applianceStatus: 1
        }
      }
    )

    if (!item) {
      return {
        success: false,
        message: APPLIANCE_NOT_FOUND,
        notFound: true
      }
    }

    const certifications = mapCertifications(item)

    // Country DAs should already have been notified (email sent) that a decision
    // is required: 'new' -> 'awaiting_decision'.
    if (findNotYetNotifiedCountries(item).length > 0) {
      logger.warn(
        `Appliance ${id} has countries that have not been notified that a decision is required`
      )
    }

    return {
      success: true,
      data: {
        id: item.id ?? id,
        modelName: item.modelName || '',
        modelNumber: item.modelNumber || '',
        applicationId: item.applicationId || null,
        certifications,
        status: item.applianceStatus || 'pending',
        canTogglePublicVisibility: findCertified(item).length > 0,
        isVisibleToPublic: item.isVisibleToPublic,
        isLegacyRecord: item.isLegacyRecord
      }
    }
  } catch (error) {
    logger.error(error, 'Failed to fetch admin appliance')
    throw error
  }
}

/**
 * Set public visibility for an appliance and recalculate its applianceStatus
 */
async function updateApplianceVisibility(db, id, isVisibleToPublic, logger) {
  if (!logger) {
    throw new Error(LOGGER_REQUIRED_ERROR)
  }
  try {
    const collection = db.collection('Appliances')
    const item = await collection.findOne(
      { id },
      {
        projection: {
          'technicalReview.status': 1,
          ...Object.fromEntries(
            CERTIFICATION_FIELDS.map((field) => [`${field}.status`, 1])
          ),
          _id: 0
        }
      }
    )

    if (!item) {
      return { success: false, message: APPLIANCE_NOT_FOUND, notFound: true }
    }

    // Mirrors calculateItemStatus: visibility only affects accepted, certified items
    const canTogglePublicVisibility =
      item.technicalReview?.status === 'accepted' &&
      findCertified(item).length > 0

    if (!canTogglePublicVisibility) {
      return {
        success: false,
        message:
          'Appliance visibility can only change once its technical review is accepted and it is certified in at least one country',
        incomplete: true
      }
    }

    await collection.updateOne(
      { id },
      { $set: { isVisibleToPublic, updatedAt: new Date() } }
    )

    const applianceStatus = await calculateItemStatus(db, 'appliance', id)

    logger.info(`Appliance visibility set to ${isVisibleToPublic}: ${id}`)

    return {
      success: true,
      data: { id, isVisibleToPublic, applianceStatus }
    }
  } catch (error) {
    logger.error(error, 'Failed to update appliance visibility')
    throw error
  }
}

export {
  createAppliance,
  getAllAppliances,
  getApplianceById,
  updateAppliance,
  deleteAppliance,
  searchAdminAppliances,
  getAdminApplianceById,
  updateApplianceVisibility
}
