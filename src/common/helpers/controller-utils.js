/**
- Common controller utilities and constants
- Shared across all controller modules
 */

const LOGGER_REQUIRED_ERROR = 'logger is required'
const APPLICATION_NOT_FOUND = 'Application not found'
const APPLIANCE_NOT_FOUND = 'Appliance not found'
const FUEL_NOT_FOUND = 'Fuel not found'
const MONGO_ILLEGAL_OPERATION_CODE = 20
const ID_PATTERN = /^\d{4}-\d+$/

function ensureLogger(logger) {
  if (!logger) {
    throw new Error(LOGGER_REQUIRED_ERROR)
  }
}

async function getCompleteApplicationIds(db) {
  const completeApplications = await db
    .collection('Applications')
    .find({ status: 'complete' })
    .project({ id: 1, _id: 0 })
    .toArray()

  return completeApplications.map((app) => app.id).filter(Boolean)
}

const escapeRegex = (value) =>
  String(value).replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)

function buildAdminSearchQuery(
  completeAppIds,
  { query = '', statuses = [], searchFields = [], statusField }
) {
  const normalisedStatuses = (statuses || [])
    .map((status) => (status || '').toLowerCase().trim())
    .filter(Boolean)

  const searchQuery = {
    $or: [{ applicationId: { $in: completeAppIds } }, { isLegacyRecord: true }]
  }

  if (query?.trim()) {
    const trimmedQuery = escapeRegex(query.trim())
    searchQuery.$and = [
      {
        $or: searchFields.map((field) => ({
          [field]: { $regex: trimmedQuery, $options: 'i' }
        }))
      }
    ]
  }

  if (normalisedStatuses.length > 0 && statusField) {
    searchQuery[statusField] = {
      $in: normalisedStatuses.map(
        (status) => new RegExp(`^${escapeRegex(status)}$`, 'i')
      )
    }
  }

  return searchQuery
}

async function fetchPaginatedAdminItems(
  collection,
  searchQuery,
  { page = 1, limit = 20, mapItem }
) {
  const skip = (page - 1) * limit
  const [items, total] = await Promise.all([
    collection
      .find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    collection.countDocuments(searchQuery)
  ])

  return {
    success: true,
    data: items.map(mapItem),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 0)
    }
  }
}

export {
  ensureLogger,
  escapeRegex,
  getCompleteApplicationIds,
  buildAdminSearchQuery,
  fetchPaginatedAdminItems,
  LOGGER_REQUIRED_ERROR,
  APPLICATION_NOT_FOUND,
  APPLIANCE_NOT_FOUND,
  FUEL_NOT_FOUND,
  MONGO_ILLEGAL_OPERATION_CODE,
  ID_PATTERN
}
