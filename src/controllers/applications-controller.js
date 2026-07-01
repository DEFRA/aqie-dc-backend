/**
 * Applications Controller
 * Business logic for application-related operations
 */

import { randomUUID } from 'crypto'
import { generateSecureId } from '../common/helpers/db-utils.js'
import { applianceSchema } from '../routes/schema.js'

/**
 * Create a new application with appliances using MongoDB transactions (if available)
 * Falls back to direct operations for standalone MongoDB instances
 * @param {MongoClient} client - MongoDB client for transaction support
 * @param {Db} db - MongoDB database instance
 * @param {Object} payload - Application payload with appliances array
 * @param {Object} logger - Logger instance
 */
async function createApplication(client, db, payload, logger) {
  const { appliances, ...applicationData } = payload;

  // Try to use transactions if client supports it, otherwise fall back to direct operations
  const session = client.startSession();
  let useTransaction = false;

  try {
    // Check if transaction is supported by attempting to start one
    try {
      useTransaction = true;
      return await session.withTransaction(async () => {
        return await performApplicationInsert(db, payload, logger, session);
      });
    } catch (transactionError) {
      // If transaction fails (e.g., standalone MongoDB), fall back to direct operations
      if (transactionError.message.includes('Transaction') || 
          transactionError.message.includes('replica set')) {
        logger.warn('Transactions not supported, falling back to direct operations');
        useTransaction = false;
        return await performApplicationInsert(db, payload, logger, null);
      }
      throw transactionError;
    }
  } finally {
    await session.endSession();
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
  const { appliances, ...applicationData } = payload;
  
  const appCollection = db.collection('Applications');
  const applianceCollection = db.collection('Appliance');

  // Build and insert Application
  const applicationId = randomUUID();
  const now = new Date();

  //following the schema in the applicationSchema.js file (MongoDB validator)
  const application = {
    applicationId: applicationId,
    applicationType: applicationData.applicationType,
    status: 'new',
    reviewer: applicationData.reviewer || null,
    reviewNotes: applicationData.reviewNotes || null,
    additionalMetadata: applicationData.additionalMetadata || {},
    submittedAt: applicationData.submittedAt
      ? new Date(applicationData.submittedAt)
      : null,
    reviewedAt: null,
    createdAt: applicationData.createdAt
      ? new Date(applicationData.createdAt)
      : now,
    updatedAt: now
  };

  const insertOptions = session ? { session } : {};
  const appResult = await appCollection.insertOne(application, insertOptions);
  if (!appResult.insertedId) {
    throw new Error('Failed to insert application');
  }

  // Insert appliances with applicationId link
  let savedAppliances = [];
  if (Array.isArray(appliances) && appliances.length > 0) {
    const appliancesToInsert = appliances.map((appliance) => {
      // Validate each appliance through schema to apply defaults
      const { value, error } = applianceSchema.validate({
        ...appliance,
        applicationId: applicationId // Add applicationId to payload for validation
      }, {
        abortEarly: false
      });

      if (error) {
        throw new Error(`Appliance validation failed: ${error.details.map(d => d.message).join(', ')}`);
      }

      return {
        ...value,
        applianceId: value.applianceId || `APP-${generateSecureId()}`,
        applicationId: applicationId // Ensure applicationId is set
      };
    });

    const applianceResult = await applianceCollection.insertMany(
      appliancesToInsert,
      insertOptions
    );

    logger.info(
      { 
        acknowledged: applianceResult.acknowledged,
        insertedIdCount: Object.keys(applianceResult.insertedIds || {}).length
      },
      'Appliance insertMany result'
    );

    if (!applianceResult.acknowledged) {
      throw new Error('MongoDB did not acknowledge appliance insert');
    }

    // Map appliances with their inserted _ids (if available)
    savedAppliances = appliancesToInsert.map((appliance, index) => {
      const result = { ...appliance };
      // insertedIds may be undefined if collection was auto-created
      if (applianceResult.insertedIds && applianceResult.insertedIds[index]) {
        result._id = applianceResult.insertedIds[index];
      }
      return result;
    });
  }

  logger.info(
    `Application created: ${applicationId} with ${savedAppliances.length} appliances`
  );

  // Return detailed response with success message
  return {
    success: true,
    message: 'Application and appliances created successfully',
    data: {
      ...application,
      appliances: savedAppliances
    }
  };
}

/**
 * Get all applications with pagination
 */
async function getAllApplications(db, { page = 1, limit = 20 }, logger) {
  try {
    const collection = db.collection('Applications')
    const skip = (page - 1) * limit

    // Get applications with pagination
    const applications = await collection
      .find({})
      .sort({ submittedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    // Get total count
    const total = await collection.countDocuments()

    return {
      success: true,
      data: applications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) {
    logger.error(error, 'Failed to fetch applications')
    throw error
  }
}

/**
 * Get application by applicationId
 */
async function getApplicationById(db, applicationId, logger) {
  try {
    const collection = db.collection('Applications')
    const application = await collection.findOne({ applicationId })

    if (!application) {
      return {
        success: false,
        message: 'Application not found',
        notFound: true
      }
    }

    // Also fetch associated appliances/fuels
    let linkedItems = []
    if (application.applicationType === 'appliance') {
      linkedItems = await db
        .collection('Appliances')
        .find({ applicationId })
        .toArray()
    } else if (application.applicationType === 'fuel') {
      linkedItems = await db
        .collection('Fuels')
        .find({ applicationId })
        .toArray()
    }

    return {
      success: true,
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
        { applicationId: { $regex: query, $options: 'i' } }
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
    const applicationCounts = await db
      .collection('Applications')
      .aggregate([
        {
          $group: {
            _id: { type: '$applicationType', status: '$status' },
            count: { $sum: 1 }
          }
        }
      ])
      .toArray()

    const summary = {
      appliance: { new: 0, inProgress: 0, records: 0 },
      fuel: { new: 0, inProgress: 0, records: 0 }
    }

    for (const row of applicationCounts) {
      const { type, status } = row._id
      if (!summary[type]) continue
      if (status === 'new') summary[type].new = row.count
      else if (status === 'in_progress') summary[type].inProgress = row.count
    }

    //records count from published appliances and fuels
    summary.appliance.records = await db
      .collection('Appliance')
      .countDocuments()
    summary.fuel.records = await db.collection('Fuel').countDocuments()
    return summary
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
    // We get all applicationIds first to limit the appliances query
    const applicationIds = applications.map((app) => app.applicationId)

    const allAppliances = await itemCollection
      .find({ applicationId: { $in: applicationIds } })
      .toArray()

    // 3. Stitch them together
    // We map through the applications and filter the appliances array for matches
    const combinedData = applications.map((app) => {
      return {
        ...app,
        appliances: allAppliances.filter(
          (appliance) => appliance.applicationId === app.applicationId
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

async function getCertainApplicationsWithAppliances(
  db,
  logger,
  status = 'new'
) {
  try {
    const appCollection = db.collection('Applications')
    const itemCollection = db.collection('Appliances')

    // 1. Fetch only applications where status is 'new'
    const newApplications = await appCollection
      .find({ status: status })
      .toArray()

    // If no new applications found, return an empty array early
    if (newApplications.length === 0) {
      return []
    }

    // 2. Extract the IDs of only the 'new' applications
    const applicationIds = newApplications.map((app) => app.applicationId)

    // 3. Fetch all appliances linked to those specific application IDs
    const associatedAppliances = await itemCollection
      .find({ applicationId: { $in: applicationIds } })
      .toArray()

    // 4. Stitch the appliances into their respective applications
    const result = newApplications.map((app) => ({
      ...app,
      appliances: associatedAppliances.filter(
        (appliance) => appliance.applicationId === app.applicationId
      )
    }))

    logger.info(`Found ${result.length} new applications.`)
    return result
  } catch (error) {
    logger.error(error, 'Failed to fetch new applications')
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
  getCertainApplicationsWithAppliances
}
