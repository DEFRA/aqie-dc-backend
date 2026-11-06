/**
 * Applications Controller - Business logic for application operations
 */

import {
  generateNextId,
  getFullAddress
} from '../common/helpers/data-transformer.js'
import {
  groupItemsByTechReviewStatus,
  isApplicationReviewComplete
} from '../common/helpers/review-status.js'
import {
  getItemsCollectionName,
  getItemNameField,
  validateApplicationType
} from '../common/helpers/application-type.js'
import {
  ensureLogger,
  getCompleteApplicationIds,
  APPLICATION_NOT_FOUND
} from '../common/helpers/controller-utils.js'

const MONGO_ILLEGAL_OPERATION_CODE = 20
const ID_PATTERN = /^\d{4}-\d+$/

async function generateApplicationId(collection, applicationType, session) {
  const lastApplication = await collection.findOne(
    { id: { $regex: ID_PATTERN }, type: applicationType },
    { sort: { _id: -1 }, projection: { id: 1 }, ...(session && { session }) }
  )
  return generateNextId(lastApplication?.id)
}

async function createApplication(client, db, payload, logger) {
  ensureLogger(logger)
  const session = client.startSession()

  try {
    return await session.withTransaction(async () => {
      return performApplicationInsert(db, payload, logger, session)
    })
  } catch (transactionError) {
    logger.error(
      {
        err: transactionError,
        code: transactionError.code,
        codeName: transactionError.codeName,
        errorLabels: transactionError.errorLabels
      },
      'Transaction attempt failed'
    )

    if (isTransactionUnsupportedError(transactionError)) {
      logger.warn(
        'Transactions not supported, falling back to direct operations'
      )
      return await performApplicationInsert(db, payload, logger, null)
    }
    throw transactionError
  } finally {
    await session.endSession()
  }
}

function isTransactionUnsupportedError(error) {
  const message = (error.message || '').toLowerCase()
  return (
    message.includes('transaction') ||
    message.includes('replica set') ||
    message.includes('mongos') ||
    error.code === MONGO_ILLEGAL_OPERATION_CODE ||
    error.codeName === 'IllegalOperation'
  )
}

function buildApplication(applicationData, id) {
  const now = new Date()
  return {
    id,
    type: applicationData.type,
    status: applicationData.status || 'new',
    reviewedBy: applicationData.reviewedBy || null,
    submittedAt: applicationData.submittedAt
      ? new Date(applicationData.submittedAt)
      : null,
    referenceNumber: applicationData.referenceNumber,
    createdAt: applicationData.createdAt
      ? new Date(applicationData.createdAt)
      : now
  }
}

async function insertLinkedItems(
  db,
  items,
  applicationId,
  itemsCollectionName,
  logger,
  session
) {
  const itemsCollection = db.collection(itemsCollectionName)
  const insertOptions = session ? { session } : {}

  const lastItem = await itemsCollection.findOne(
    { id: { $regex: ID_PATTERN } },
    { sort: { _id: -1 }, projection: { id: 1 }, ...(session && { session }) }
  )
  let lastItemId = lastItem?.id
  const itemsToInsert = items.map((item) => {
    const id = item.id || generateNextId(lastItemId)
    lastItemId = id
    return { ...item, id, applicationId }
  })

  const itemsResult = await itemsCollection.insertMany(
    itemsToInsert,
    insertOptions
  )

  logger.info(
    {
      acknowledged: itemsResult.acknowledged,
      insertedIdCount: Object.keys(itemsResult.insertedIds || {}).length
    },
    `${itemsCollectionName} insertMany result`
  )

  if (!itemsResult.acknowledged) {
    throw new Error(`MongoDB did not acknowledge ${itemsCollectionName} insert`)
  }

  return itemsToInsert.map((item, index) => {
    const result = { ...item }
    if (itemsResult.insertedIds?.[index]) {
      result._id = itemsResult.insertedIds[index]
    }
    return result
  })
}

async function performApplicationInsert(db, payload, logger, session) {
  const { appliances, fuels, ...applicationData } = payload
  const itemsKey = applicationData.type === 'fuel' ? 'fuels' : 'appliances'
  const items = applicationData.type === 'fuel' ? fuels : appliances

  const appCollection = db.collection('Applications')
  const itemsCollectionName = getItemsCollectionName(applicationData.type)

  const applicationId = await generateApplicationId(
    appCollection,
    applicationData.type,
    session
  )
  const application = buildApplication(applicationData, applicationId)

  const insertOptions = session ? { session } : {}
  const appResult = await appCollection.insertOne(application, insertOptions)
  if (!appResult.insertedId) {
    throw new Error('Failed to insert application')
  }

  let savedItems = []
  if (Array.isArray(items) && items.length > 0) {
    savedItems = await insertLinkedItems(
      db,
      items,
      applicationId,
      itemsCollectionName,
      logger,
      session
    )
  }

  logger.info(
    `Application created: ${application.id} with ${savedItems.length} ${itemsCollectionName || 'items'}`
  )

  return {
    success: true,
    message: 'Application and linked items created successfully',
    data: { ...application, [itemsKey]: savedItems }
  }
}

async function applicationExistsByReference(db, referenceNumber) {
  if (!referenceNumber) {
    return false
  }
  const found = await db
    .collection('Applications')
    .findOne({ referenceNumber }, { projection: { _id: 1 } })
  return Boolean(found)
}

async function getAllApplications(db, _options, logger) {
  ensureLogger(logger)
  try {
    const applications = await db
      .collection('Applications')
      .find({})
      .sort({ submittedAt: -1, createdAt: -1 })
      .toArray()
    return {
      success: true,
      message: 'Applications retrieved successfully',
      data: applications
    }
  } catch (error) {
    logger.error(error, 'Failed to fetch applications')
    throw error
  }
}

async function getApplicationById(db, applicationId, logger, groupBy) {
  ensureLogger(logger)
  try {
    const application = await db
      .collection('Applications')
      .findOne({ id: applicationId })

    if (!application) {
      // Fallback to legacy lookup: search Appliances for legacy.applicationId match
      const legacyAppliance = await db
        .collection('Appliances')
        .findOne({ 'legacy.applicationId': applicationId })

      if (!legacyAppliance) {
        return {
          success: false,
          message: APPLICATION_NOT_FOUND,
          notFound: true
        }
      }

      // Return legacy appliance as a reference record (no linked items)
      return {
        success: true,
        message: 'Legacy application retrieved successfully',
        data: {
          id: applicationId,
          legacy: legacyAppliance.legacy,
          isLegacyReference: true,
          linkedItems: []
        }
      }
    }

    let linkedItems = []
    const collectionName = getItemsCollectionName(application.type)
    if (collectionName) {
      linkedItems = await db
        .collection(collectionName)
        .find({ applicationId })
        .toArray()

      const nameField = getItemNameField(application.type)
      if (nameField) {
        linkedItems = linkedItems.map((item) => ({
          ...item,
          name: item[nameField]
        }))
      }
    } else {
      logger.warn(`Unknown application type: ${application.type}`)
    }

    const isGrouped = groupBy === 'techReviewStatus'

    return {
      success: true,
      message: 'Application retrieved successfully',
      data: {
        ...application,
        fullAddress: getFullAddress(linkedItems[0]),
        linkedItems: isGrouped
          ? groupItemsByTechReviewStatus(linkedItems)
          : linkedItems,
        ...(isGrouped && {
          applicationReviewComplete: isApplicationReviewComplete(linkedItems)
        })
      }
    }
  } catch (error) {
    logger.error(error, 'Failed to fetch application')
    throw error
  }
}

async function searchApplications(db, { query, page = 1, limit = 20 }, logger) {
  ensureLogger(logger)
  try {
    const skip = (page - 1) * limit
    const collection = db.collection('Applications')

    const searchQuery = {
      $or: [
        { status: { $regex: query, $options: 'i' } },
        { reviewedBy: { $regex: query, $options: 'i' } },
        { 'reviewedBy.name': { $regex: query, $options: 'i' } },
        { 'reviewedBy.email': { $regex: query, $options: 'i' } },
        { id: { $regex: query, $options: 'i' } }
      ]
    }

    const applications = await collection
      .find(searchQuery)
      .sort({ submittedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const total = await collection.countDocuments(searchQuery)

    return {
      success: true,
      message: 'Applications search completed successfully',
      data: applications,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    }
  } catch (error) {
    logger.error(error, 'Failed to search applications')
    throw error
  }
}

async function getCounts(db, logger) {
  ensureLogger(logger)
  try {
    const applicationCounts = {
      appliance: { new: 0, inProgress: 0, records: 0 },
      fuel: { new: 0, inProgress: 0, records: 0 }
    }

    const applicationStatusCounts = await db
      .collection('Applications')
      .aggregate([
        {
          $group: {
            _id: { type: '$type', status: '$status' },
            count: { $sum: 1 }
          }
        }
      ])
      .toArray()

    for (const row of applicationStatusCounts) {
      const { type, status } = row._id
      if (!applicationCounts[type]) {
        continue
      }

      switch (status) {
        case 'new':
          applicationCounts[type].new = row.count
          break
        case 'in_progress':
          applicationCounts[type].inProgress = row.count
          break
        default:
          break
      }
    }

    const completeAppIds = await getCompleteApplicationIds(db)
    const filter = { applicationId: { $in: completeAppIds } }
    const appliancesCollection = db.collection('Appliances')

    const [applianceRecordCount, fuelRecordCount, legacyApplianceRecordCount] =
      await Promise.all([
        appliancesCollection.countDocuments(filter),
        db.collection('Fuels').countDocuments(filter),
        appliancesCollection.countDocuments({ isLegacyRecord: true })
      ])

    applicationCounts.appliance.records =
      applianceRecordCount + legacyApplianceRecordCount
    applicationCounts.fuel.records = fuelRecordCount

    return {
      success: true,
      message: 'Application counts retrieved successfully',
      data: applicationCounts
    }
  } catch (error) {
    logger.error(error, 'Failed to fetch counts')
    throw error
  }
}

async function getAllApplicationsWithAppliances(db, logger) {
  ensureLogger(logger)
  try {
    const [applications, allAppliances] = await Promise.all([
      db.collection('Applications').find({}).toArray(),
      db.collection('Appliances').find({}).toArray()
    ])

    const combinedData = applications.map((app) => {
      return {
        ...app,
        linkedItems: allAppliances.filter(
          (appliance) => appliance.applicationId === app.id
        )
      }
    })

    logger.info(
      `Retrieved ${combinedData.length} applications with nested appliances`
    )

    return {
      success: true,
      message: 'Applications with linked items retrieved successfully',
      data: combinedData
    }
  } catch (error) {
    logger.error(error, 'Failed to retrieve all applications with appliances')
    throw error
  }
}

async function getApplicationsSummaryByStatus(
  db,
  logger,
  type,
  statuses = ['new', 'in_progress']
) {
  ensureLogger(logger)
  try {
    const applicationTypeDetails = validateApplicationType(type, logger)
    if (!applicationTypeDetails) {
      return {
        success: false,
        message: `Unknown application type: ${type}`,
        notFound: true
      }
    }

    const { collectionName, nameField } = applicationTypeDetails
    const appCollection = db.collection('Applications')
    const itemsCollection = db.collection(collectionName)
    const applications = await appCollection
      .find({ type, status: { $in: statuses } })
      .sort({ submittedAt: -1, createdAt: -1 })
      .toArray()

    if (applications.length === 0) {
      return {
        success: true,
        data: { new: [], inProgress: [] }
      }
    }

    const applicationIds = applications.map((app) => app.id)
    const items = await itemsCollection
      .find({ applicationId: { $in: applicationIds } })
      .project({ _id: 0, id: 1, applicationId: 1, [nameField]: 1 })
      .toArray()

    const statusToKey = { new: 'new', in_progress: 'inProgress' }
    const result = { new: [], inProgress: [] }

    for (const app of applications) {
      const key = statusToKey[app.status]
      if (!key) {
        logger.warn(`Unknown application status: ${app.status}`)
        continue
      }

      result[key].push({
        id: app.id,
        type: app.type,
        status: app.status,
        submittedAt: app.submittedAt,
        items: items
          .filter((item) => item.applicationId === app.id)
          .map((item) => ({ id: item.id, name: item[nameField] })),
        reviewedBy: app.reviewedBy
      })
    }

    logger.info(
      `Found ${result.new.length} new and ${result.inProgress.length} in-progress ${type} applications`
    )

    return { success: true, data: result }
  } catch (error) {
    logger.error(error, 'Failed to fetch applications with linked item names')
    throw error
  }
}

async function getApplicationSummaryById(db, applicationId, type, logger) {
  ensureLogger(logger)
  try {
    const applicationTypeDetails = validateApplicationType(type, logger)
    if (!applicationTypeDetails) {
      return {
        success: false,
        message: `Unknown application type: ${type}`,
        notFound: true
      }
    }

    const { collectionName, nameField } = applicationTypeDetails

    const [application, companyDetails, linkedItems] = await Promise.all([
      db.collection('Applications').findOne({ id: applicationId, type }),
      db.collection(collectionName).findOne(
        { applicationId },
        {
          projection: {
            companyName: 1,
            companyFullAddress: 1,
            companyAddress: 1,
            companyContact: 1,
            responsiblePerson: 1,
            hasCustomerComplaintsSystem: 1,
            fuelBagging: 1,
            supplierType: 1
          }
        }
      ),
      db
        .collection(collectionName)
        .find(
          { applicationId },
          { projection: { id: 1, [nameField]: 1, technicalReview: 1 } }
        )
        .toArray()
    ])

    if (!application) {
      return { success: false, message: APPLICATION_NOT_FOUND, notFound: true }
    }

    return {
      success: true,
      message: 'Application summary retrieved successfully',
      data: {
        id: application.id,
        companyName: companyDetails?.companyName,
        fullAddress: getFullAddress(companyDetails),
        companyContact: companyDetails?.companyContact,
        ...(type === 'fuel' && {
          responsiblePerson: companyDetails?.responsiblePerson,
          hasCustomerComplaintsSystem:
            companyDetails?.hasCustomerComplaintsSystem,
          fuelBagging: companyDetails?.fuelBagging,
          supplierType: companyDetails?.supplierType
        }),
        linkedItems
      }
    }
  } catch (error) {
    logger.error(error, 'Failed to fetch application summary')
    throw error
  }
}

export {
  createApplication,
  applicationExistsByReference,
  getAllApplications,
  getApplicationById,
  searchApplications,
  getCounts,
  getAllApplicationsWithAppliances,
  getApplicationsSummaryByStatus,
  getApplicationSummaryById
}
