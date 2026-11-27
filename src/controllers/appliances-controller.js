import {
  generateNextId,
  getFullAddress,
  toDotted
} from '../common/helpers/data-transformer.js'
import {
  CERTIFICATION_FIELDS,
  COUNTRY_CERTIFICATION_FIELDS,
  CERTIFIED_STATUS,
  findCertified,
  findNotYetNotifiedCountries,
  mapCertifications
} from '../common/helpers/certification.js'
import { calculateItemStatus } from '../common/helpers/item-status.js'
import { toUserActor } from '../common/helpers/action-history.js'
import { validateApplicationType } from '../common/helpers/application-type.js'
import {
  ensureLogger,
  escapeRegex,
  getCompleteApplicationIds,
  buildAdminSearchQuery,
  fetchPaginatedAdminItems,
  APPLIANCE_NOT_FOUND,
  ID_PATTERN
} from '../common/helpers/controller-utils.js'

/**
- Create a new appliance
 */
async function createAppliance(db, item, logger) {
  if (!db) {
    throw new Error('db is required')
  }
  if (!item) {
    throw new Error('item is required')
  }
  ensureLogger(logger)
  try {
    const collection = db.collection('Appliances')

    const now = new Date()

    // Generate ID if not provided, using chronological sequence
    let id = item.id
    if (!id) {
      const lastAppliance = await collection.findOne(
        { id: { $regex: ID_PATTERN } },
        { sort: { _id: -1 }, projection: { id: 1 } }
      )
      id = generateNextId(lastAppliance?.id)
    }

    // Build appliance document
    const appliance = {
      ...item,
      id,
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
// Returns summary object for list views
function mapApplianceSummary(item) {
  return {
    id: item.id || '',
    name: item.modelName || '',
    companyName: item.companyName || '',
    permittedFuels: item.permittedFuels || '',
    type: item.applianceType,
    modelNumber: item.modelNumber,
    certifiedCountries: findCertified(item)
  }
}

const containsAny = (field, terms) =>
  terms.map((term) => ({
    [field]: { $regex: escapeRegex(term), $options: 'i' }
  }))

// Builds the public finder filter: live appliances matching search terms (OR across
// fields/terms) AND every selected filter group (OR within a group).
function buildPublicSearchQuery({
  query = '',
  certifiedIn = [],
  fuelsAllowed = [],
  applianceType = []
}) {
  const conditions = [{ applianceStatus: 'live' }]

  const terms = query
    .split(',')
    .map((term) => term.trim())
    .filter(Boolean)
  if (terms.length > 0) {
    conditions.push({
      $or: ['modelName', 'companyName', 'modelNumber', 'applianceType'].flatMap(
        (field) => containsAny(field, terms)
      )
    })
  }

  if (certifiedIn.length > 0) {
    const certificationFilters = certifiedIn
      .map(
        (country) => COUNTRY_CERTIFICATION_FIELDS[country.replaceAll(' ', '-')]
      )
      .filter(Boolean)
      .map((field) => ({ [`${field}.status`]: CERTIFIED_STATUS }))
    // An unrecognised country must match nothing rather than be ignored
    conditions.push({
      $or: certificationFilters.length ? certificationFilters : [{ _id: null }]
    })
  }

  if (fuelsAllowed.length > 0) {
    conditions.push({
      $or: fuelsAllowed.map((fuel) => ({
        permittedFuels: {
          $regex: String.raw`(^|,)\s*${escapeRegex(fuel)}\s*(,|$)`,
          $options: 'i'
        }
      }))
    })
  }

  if (applianceType.length > 0) {
    conditions.push({
      $or: applianceType.map((type) => ({
        applianceType: { $regex: `^${escapeRegex(type)}$`, $options: 'i' }
      }))
    })
  }

  return { $and: conditions }
}

/**
- Get live appliances, optionally searched/filtered.
- Paginated when `limit` is given; otherwise returns every match.
 */
async function getAllAppliances(
  db,
  { page = 1, limit, ...filters } = {},
  logger
) {
  ensureLogger(logger)
  try {
    const collection = db.collection('Appliances')
    const searchQuery = buildPublicSearchQuery(filters)
    const cursor = collection.find(searchQuery).sort({ createdAt: -1 })

    if (!limit) {
      const allAppliances = await cursor.toArray()
      return {
        success: true,
        data: allAppliances.map((item) => mapApplianceSummary(item))
      }
    }

    const [appliances, total] = await Promise.all([
      cursor
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      collection.countDocuments(searchQuery)
    ])

    return {
      success: true,
      data: appliances.map((item) => mapApplianceSummary(item)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) {
    logger.error(error, 'Failed to fetch appliances')
    throw error
  }
}

/**
- Public: get a single live appliance by ID (non-live is treated as not found)
 */
async function getApplianceById(db, id, logger) {
  ensureLogger(logger)
  try {
    const collection = db.collection('Appliances')
    const item = await collection.findOne({ id, applianceStatus: 'live' })

    if (!item) {
      return {
        success: false,
        message: APPLIANCE_NOT_FOUND,
        notFound: true
      }
    }

    return {
      success: true,
      data: {
        ...item,
        certifiedCountries: findCertified(item),
        name: item.modelName,
        fullAddress: getFullAddress(item)
      }
    }
  } catch (error) {
    logger.error(error, 'Failed to fetch appliance')
    throw error
  }
}

/**
- Update an appliance
 */
async function updateAppliance(db, id, updates, logger) {
  ensureLogger(logger)
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
- Delete an appliance
 */
async function deleteAppliance(db, id, logger) {
  ensureLogger(logger)
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
- Admin: search appliances by name, model number, or type with pagination
 */
async function getAllAdminAppliances(
  db,
  { query = '', page = 1, limit = 20, statuses = [] } = {},
  logger
) {
  ensureLogger(logger)
  try {
    const completeAppIds = await getCompleteApplicationIds(db)
    const searchQuery = buildAdminSearchQuery(completeAppIds, {
      query,
      statuses,
      searchFields: [
        'modelName',
        'companyName',
        'modelNumber',
        'applianceType'
      ],
      statusField: 'applianceStatus'
    })

    return await fetchPaginatedAdminItems(
      db.collection('Appliances'),
      searchQuery,
      {
        page,
        limit,
        mapItem: (item) => ({
          id: item.id || '',
          name: item.modelName || '',
          status: item.applianceStatus || 'pending'
        })
      }
    )
  } catch (error) {
    logger.error(error, 'Failed to search admin appliances')
    throw error
  }
}

/**
- Admin: get a single appliance record for the admin frontend
 */
async function getAdminApplianceById(db, id, logger) {
  ensureLogger(logger)
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
          applianceStatus: 1,
          technicalReview: 1,
          instructionManual: 1,
          servicingManual: 1,
          legacy: 1
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
        modelName: item.modelName,
        modelNumber: item.modelNumber || '',
        applicationId: item.applicationId || null,
        certifications,
        status: item.applianceStatus,
        canTogglePublicVisibility: findCertified(item).length > 0,
        isVisibleToPublic: item.isVisibleToPublic,
        isLegacyRecord: item.isLegacyRecord,
        technicalReview: item.technicalReview,
        instructionManual: item.instructionManual ?? null,
        servicingManual: item.servicingManual ?? null,
        legacy: item.legacy ?? null
      }
    }
  } catch (error) {
    logger.error(error, 'Failed to fetch admin appliance')
    throw error
  }
}

/**
- Set public visibility for an appliance or fuel and recalculate its status
 *
- @param {{ name: string, email?: string }} reviewedBy - signed-in user who clicked
- @param {'appliance'|'fuel'} [type]
 */
async function updateApplianceVisibility(
  db,
  id,
  isVisibleToPublic,
  logger,
  reviewedBy,
  type = 'appliance'
) {
  ensureLogger(logger)
  const applicationTypeDetails = validateApplicationType(type, logger)
  if (!applicationTypeDetails) {
    throw new Error(`Unsupported item type: ${type}`)
  }
  const { collectionName } = applicationTypeDetails
  if (!reviewedBy?.name) {
    throw new Error('reviewedBy is required')
  }
  const label = type === 'fuel' ? 'Fuel' : 'Appliance'
  try {
    const collection = db.collection(collectionName)
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
      return { success: false, message: `${label} not found`, notFound: true }
    }

    // Mirrors calculateItemStatus: visibility only affects accepted, certified items
    const canTogglePublicVisibility =
      item.technicalReview?.status === 'accepted' &&
      findCertified(item).length > 0

    if (!canTogglePublicVisibility) {
      return {
        success: false,
        message: `${label} visibility can only change once its technical review is accepted and it is certified in at least one country`,
        incomplete: true
      }
    }

    await collection.updateOne(
      { id },
      { $set: { isVisibleToPublic, updatedAt: new Date() } }
    )

    await calculateItemStatus(db, type, id, {
      logger,
      actor: toUserActor(reviewedBy)
    })

    logger.info(`${label} visibility set to ${isVisibleToPublic}: ${id}`)

    return { success: true }
  } catch (error) {
    logger.error(error, `Failed to update ${label.toLowerCase()} visibility`)
    throw error
  }
}

export {
  createAppliance,
  getAllAppliances,
  getApplianceById,
  updateAppliance,
  deleteAppliance,
  getAllAdminAppliances,
  getAdminApplianceById,
  updateApplianceVisibility
}
