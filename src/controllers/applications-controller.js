/**
 * Applications Controller
 * Business logic for application-related operations
 */

import { randomUUID } from 'crypto'
import { generateSecureId } from '../common/helpers/data-transformer.js'
import { getCompleteApplicationRecordsFilter } from './complete-application-records-filter.js'

/**
 * Create a new application with appliances using MongoDB transactions (if available)
 * Falls back to direct operations for standalone MongoDB instances
 * @param {MongoClient} client - MongoDB client for transaction support
 * @param {Db} db - MongoDB database instance
 * @param {Object} payload - Application payload with appliances array
 * @param {Object} logger - Logger instance
 */
async function createApplication(client, db, payload, logger) {
  // Try to use transactions if client supports it, otherwise fall back to direct operations
  const session = client.startSession()

  try {
    return await session.withTransaction(async () => {
      return performApplicationInsert(db, payload, logger, session)
    })
  } catch (transactionError) {
    if (
      transactionError.message.includes('Transaction') ||
      transactionError.message.includes('replica set')
    ) {
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

function buildApplication(applicationData) {
  const id = randomUUID()
  const now = new Date()

  return {
    id,
    type: applicationData.type,
    status: applicationData.status || 'new',
    reviewer: applicationData.reviewer || null,
    submittedDate: applicationData.submittedDate
      ? new Date(applicationData.submittedDate)
      : null,
    referenceNumber: applicationData.referenceNumber,
    createdAt: applicationData.createdAt
      ? new Date(applicationData.createdAt)
      : now
  }
}

/**
 * Perform the application and appliance insert
 * @param {Db} db - Database instance
 * @param {Object} payload - Application payload
 * @param {Object} logger - Logger
 * @param {ClientSession|null} session - MongoDB session for transactions (null if not available)
 */
async function performApplicationInsert(db, payload, logger, session) {
  const { appliances, ...applicationData } = payload

  const appCollection = db.collection('Applications')
  const applianceCollection = db.collection('Appliances')

  // Build and insert Application
  const application = buildApplication(applicationData)

  const insertOptions = session ? { session } : {}
  const appResult = await appCollection.insertOne(application, insertOptions)
  if (!appResult.insertedId) {
    throw new Error('Failed to insert application')
  }

  // Insert appliances with applicationId link
  let savedAppliances = []
  if (Array.isArray(appliances) && appliances.length > 0) {
    const appliancesToInsert = appliances.map((appliance) => ({
      ...appliance,
      applianceId: appliance.applianceId || `APP-${generateSecureId()}`,
      applicationId: application.id
    }))

    const applianceResult = await applianceCollection.insertMany(
      appliancesToInsert,
      insertOptions
    )

    logger.info(
      {
        acknowledged: applianceResult.acknowledged,
        insertedIdCount: Object.keys(applianceResult.insertedIds || {}).length
      },
      'Appliance insertMany result'
    )

    if (!applianceResult.acknowledged) {
      throw new Error('MongoDB did not acknowledge appliance insert')
    }

    // Map appliances with their inserted _ids (if available)
    savedAppliances = appliancesToInsert.map((appliance, index) => {
      const result = { ...appliance }
      // insertedIds may be undefined if collection was auto-created
      if (applianceResult.insertedIds && applianceResult.insertedIds[index]) {
        result._id = applianceResult.insertedIds[index]
      }
      return result
    })
  }

  logger.info(
    `Application created: ${application.id} with ${savedAppliances.length} appliances`
  )

  // Return detailed response with success message
  return {
    success: true,
    message: 'Application and appliances created successfully',
    data: {
      ...application,
      appliances: savedAppliances
    }
  }
}

/**
 * Get all applications with pagination
 */
async function getAllApplications(db, { page = 1, limit = 20 }, logger) {
  try {
    const collection = db.collection('Applications')
    // TODO: DECISION REQUIRED - Should we implement pagination for applications?
    // Currently disabled to return all applications. Enable pagination by uncommenting below:
    // const skip = (page - 1) * limit
    // .skip(skip)
    // .limit(limit)
    // And uncomment pagination object in return statement

    // Get all applications (pagination disabled)
    const applications = await collection
      .find({})
      .sort({ submittedDate: -1, createdAt: -1 })
      // .skip(skip)        // PAGINATION: Uncomment if needed
      // .limit(limit)      // PAGINATION: Uncomment if needed
      .toArray()

    // Get total count
    //const total = await collection.countDocuments()

    return {
      success: true,
      message: 'Applications retrieved successfully',
      data: applications
      // TODO: Pagination info - uncomment when pagination is decided
      // pagination: {
      //   page,
      //   limit,
      //   total,
      //   totalPages: Math.ceil(total / limit)
      // }
    }
  } catch (error) {
    logger.error(error, 'Failed to fetch applications')
    throw error
  }
}

/**
 * Get application by id
 */
async function getApplicationById(db, applicationId, logger) {
  try {
    const collection = db.collection('Applications')
    const application = await collection.findOne({ id: applicationId })

    if (!application) {
      return {
        success: false,
        message: 'Application not found',
        notFound: true
      }
    }

    // Also fetch associated appliances/fuels
    let linkedItems = []
    if (application.type === 'appliance') {
      linkedItems = await db
        .collection('Appliances')
        .find({ applicationId })
        .toArray()
    } else if (application.type === 'fuel') {
      linkedItems = await db
        .collection('Fuels')
        .find({ applicationId })
        .toArray()
    } else {
      logger.warn(`Unknown application type: ${application.type}`)
    }

    return {
      success: true,
      message: 'Application retrieved successfully',
      data: {
        ...application,
        linkedItems
      }
    }
  } catch (error) {
    logger.error(error, 'Failed to fetch application')
    throw error
  }
}

/**
 * Search applications by status or reviewer
 */
async function searchApplications(db, { query, page = 1, limit = 20 }, logger) {
  try {
    const collection = db.collection('Applications')
    const skip = (page - 1) * limit

    // Search in status and reviewer fields
    const searchQuery = {
      $or: [
        { status: { $regex: query, $options: 'i' } },
        { reviewer: { $regex: query, $options: 'i' } },
        { 'reviewer.name': { $regex: query, $options: 'i' } },
        { 'reviewer.email': { $regex: query, $options: 'i' } },
        { id: { $regex: query, $options: 'i' } }
      ]
    }

    const applications = await collection
      .find(searchQuery)
      .sort({ submittedDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const total = await collection.countDocuments(searchQuery)

    return {
      success: true,
      message: 'Applications search completed successfully',
      data: applications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) {
    logger.error(error, 'Failed to search applications')
    throw error
  }
}

/**
 * Get count of applications with all status and types as required by dashboard
 */
async function getCounts(db, logger) {
  try {
    const applicationCounts = {
      appliance: { new: 0, inProgress: 0, records: 0 },
      fuel: { new: 0, inProgress: 0, records: 0 }
    }

    // This sets appliance/fuel counts for applications with new and in_progress statuses.
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

    // This sets appliance/fuel counts for records of complete applications.
    // note: its not the count of complete applications, but rather the count of all appliance/fuel records belonging to complete applications

    const filter = await getCompleteApplicationRecordsFilter(db)

    const [applianceRecordCount, fuelRecordCount] = await Promise.all([
      db.collection('Appliances').countDocuments(filter),
      db.collection('Fuels').countDocuments(filter)
    ])

    // Count all legacy appliance records where legacyRecord is true.
    const legacyApplianceRecordCount = await db
      .collection('Appliances')
      .countDocuments({ legacyRecord: true })

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
  try {
    const appCollection = db.collection('Applications')
    const itemCollection = db.collection('Appliances')

    // 1. Fetch all applications
    const applications = await appCollection.find({}).toArray()

    // 2. Fetch all appliances that belong to these applications
    // We get all application IDs first to limit the appliances query
    const applicationIds = applications.map((app) => app.id)

    const allAppliances = await itemCollection
      .find({ applicationId: { $in: applicationIds } })
      .toArray()

    // 3. Stitch them together
    // We map through the applications and filter the appliances array for matches
    const combinedData = applications.map((app) => {
      return {
        ...app,
        appliances: allAppliances.filter(
          (appliance) => appliance.applicationId === app.id
        )
      }
    })

    logger.info(
      `Retrieved ${combinedData.length} applications with nested appliances`
    )

    return combinedData
  } catch (error) {
    logger.error(error, 'Failed to retrieve all applications with appliances')
    throw error
  }
}

/**
 * Get (uncomplete) applications grouped by status and with summary (returns only appliance names)
 */
async function getApplicationsWithSummary(
  db,
  logger,
  statuses = ['new', 'in_progress']
) {
  try {
    const appCollection = db.collection('Applications')
    const applianceCollection = db.collection('Appliances')

    // 1. Fetch all applications with specified statuses
    const applications = await appCollection
      .find({ status: { $in: statuses } })
      .sort({ submittedDate: -1, createdAt: -1 })
      .toArray()

    // If no applications found, return early
    if (applications.length === 0) {
      return {
        success: true,
        data: {
          new: [],
          inProgress: []
        }
      }
    }

    // 2. Extract application IDs
    const applicationIds = applications.map((app) => app.id)

    // 3. Fetch appliances and project only modelName field
    const appliances = await applianceCollection
      .find({ applicationId: { $in: applicationIds } })
      .project({ applicationId: 1, modelName: 1 })
      .toArray()

    // 4. Build result organized by status
    const result = {
      new: [],
      inProgress: []
    }

    for (const app of applications) {
      const appData = {
        id: app.id,
        type: app.type,
        status: app.status,
        submittedDate: app.submittedDate,
        appliances: appliances
          .filter((appliance) => appliance.applicationId === app.id)
          .map((appliance) => ({
            applianceId: appliance._id,
            modelName: appliance.modelName
          }))
      }

      if (app.status === 'new') {
        result.new.push(appData)
      } else if (app.status === 'in_progress') {
        result.inProgress.push(appData)
      } else {
        logger.warn(`Unknown application status: ${app.status}`)
      }
    }

    logger.info(
      `Found ${result.new.length} new and ${result.inProgress.length} in-progress applications with model names`
    )

    return {
      success: true,
      data: result
    }
  } catch (error) {
    logger.error(error, 'Failed to fetch applications with model names')
    throw error
  }
}

/**
 * Get application with linked items (appliances or fuels) summary (technical approval status and name only) by application ID
 * @param {Db} db - MongoDB database instance
 * @param {string} applicationId - Application ID to fetch summary for
 * @param {string} type - Type of associated items to fetch summary for ('appliance' | 'fuel')
 * @param {object} logger - Logger instance
 */
async function getApplicationSummaryById(db, applicationId, type, logger) {
  try {
    const application = await db
      .collection('Applications')
      .findOne({ id: applicationId })

    if (!application) {
      return {
        success: false,
        message: 'Application not found',
        notFound: true
      }
    }

    // Map incoming parameter ('appliance' / 'fuel') to MongoDB collection names
    const collectionMap = {
      appliance: 'Appliances',
      fuel: 'Fuels'
    }

    const collectionName = collectionMap[type]

    if (!collectionName) {
      logger.warn(`Unknown or unsupported application type parameter: ${type}`)
      return {
        success: false,
        message: `Invalid type parameter provided: ${type}`
      }
    }

    // Fetch address from just one linked item - as they all have the same address
    const applicationAddress = await db.collection(collectionName).findOne(
      { applicationId },
      {
        projection: {
          companyAddress: 1,
          companyAddressLine1: 1,
          companyAddressLine2: 1,
          companyAddressCity: 1,
          companyAddressCounty: 1,
          companyAddressPostcode: 1,
          _id: 0
        }
      }
    )

    const companyAddress = {
      full: applicationAddress?.companyAddress || null,
      line1: applicationAddress?.companyAddressLine1 || null,
      line2: applicationAddress?.companyAddressLine2 || null,
      city: applicationAddress?.companyAddressCity || null,
      county: applicationAddress?.companyAddressCounty || null,
      postcode: applicationAddress?.companyAddressPostcode || null
    }

    // Fetch summary of linked items (only name and technicalApproval)
    const linkedItems = await db
      .collection(collectionName)
      .find(
        { applicationId },
        { projection: { modelName: 1, technicalApproval: 1, _id: 0 } }
      )
      .toArray()

    return {
      success: true,
      message: 'Application summary retrieved successfully',
      data: {
        id: application.id,
        companyAddress,
        linkedItems // Contains item name and technicalApproval }
      }
    }
  } catch (error) {
    logger.error(error, 'Failed to fetch application summary')
    throw error
  }
}

export {
  createApplication,
  getAllApplications,
  getApplicationById,
  searchApplications,
  getCounts,
  getAllApplicationsWithAppliances,
  getApplicationsWithSummary, //getApplicationsSummaryByStatus?
  getApplicationSummaryById
}
