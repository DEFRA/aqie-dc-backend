/**
 * Applications Controller
 * Business logic for application-related operations
 */

import { randomUUID } from 'crypto'
import { generateSecureId } from '../common/helpers/db-utils.js'

/**
 * Create a new application
 */
//this uses session logic - look into
// async function createApplication(db, payload, logger) {
//   // 1. Destructure items out of the payload so they don't get
//   // saved directly into the Application document
//   const { items, ...applicationData } = payload;

//   // We use a Session for the transaction to ensure atomicity
//   const session = db.client ? db.client.startSession() : null;

//   try {
//     if (session) { session.startTransaction(); }

//     const appCollection = db.collection('Applications');
//     const itemCollection = db.collection('Items');

//     // 2. Build the Application document
//     const applicationId = randomUUID();
//     const now = new Date();

//     const application = {
//       applicationId, // This is our link (Foreign Key)
//       applicationType: applicationData.applicationType,
//       status: 'new',
//       reviewer: null,
//       reviewNotes: null,
//       createdAt: applicationData.createdAt ? new Date(applicationData.createdAt) : now,
//       updatedAt: now,
//       submittedAt: applicationData.submittedAt ? new Date(applicationData.submittedAt) : null,
//       reviewedAt: null
//     };

//     // 3. Insert Application
//     const appResult = await appCollection.insertOne(application, { session });
//     if (!appResult.insertedId) throw new Error('Failed to insert application');

//     // 4. Handle Items (The "Many" part)
//     let savedItems = [];
//     if (Array.isArray(items) && items.length > 0) {
//       const itemsToInsert = items.map(item => ({
//         ...item,
//         itemId: randomUUID(), // Give each item its own ID
//         applicationId: applicationId, // The link to the parent
//         createdAt: now
//       }));

//       await itemCollection.insertMany(itemsToInsert, { session });
//       savedItems = itemsToInsert;
//     }

//     // 5. Add the changes
//     if (session) {await session.commitTransaction(); }

//     logger.info(`Application and ${savedItems.length} items created: ${applicationId}`);

//     return {
//       success: true,
//       message: 'Application and items created successfully',
//       data: {
//         ...application,
//         items: savedItems
//       }
//     };

//   } catch (error) {
//     if (session) {await session.abortTransaction(); }
//     logger.error(error, 'Failed to create application with items');
//     throw error;
//   } finally {
//     if (session) {await session.endSession(); }
//   }
// }

async function createApplication(db, payload, logger) {
  // 1. Separate appliances from the main application metadata
  const { appliances, ...applicationData } = payload

  try {
    const appCollection = db.collection('Applications')
    const itemCollection = db.collection('Appliance') //TODO: need to change

    // 2. Build the Application document
    const applicationId = randomUUID()
    const now = new Date()

    const application = {
      ID: applicationId, // The primary identifier
      applicationType: applicationData.applicationType,
      status: 'new',
      reviewer: null,
      reviewNotes: null,
      createdAt: applicationData.createdAt
        ? new Date(applicationData.createdAt)
        : now,
      updatedAt: now,
      submittedAt: applicationData.submittedAt
        ? new Date(applicationData.submittedAt)
        : null,
      reviewedAt: null
    }

    // 3. Insert Application into the Applications collection
    const appResult = await appCollection.insertOne(application)
    if (!appResult.insertedId) {
      throw new Error('Failed to insert application')
    }

    // 4. Handle Items (The "Many" part)
    let savedItems = []
    if (Array.isArray(appliances) && appliances.length > 0) {
      // Map the newly created applicationId to each appliance
      const itemsToInsert = appliances.map((appliance) => ({
        ...appliance,
          createdAt: appliance.createdAt || now,
          updatedAt: now,
          applicationId: applicationId, // The Foreign Key link
          applianceId:
            appliance.applianceId || `APP-${generateSecureId()}` //not sure this is neccessary 
      }))

      // Insert all appliances into the Items collection
      await itemCollection.insertMany(itemsToInsert)
      savedItems = itemsToInsert
    }

    logger.info(
      `Application created: ${applicationId} with ${savedItems.length} appliances`
    )

    // 5. Return the combined object to the API handler
    return {
      success: true,
      message: 'Application and appliances created successfully',
      data: {
        ...application,
        appliances: savedItems
      }
    }
  } catch (error) {
    logger.error(error, 'Failed to create application and appliances')
    throw error
  }
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
 * Get count of applications with 'in progress' status
 */
async function getInProgressCount(db, logger) {
  try {
    const collection = db.collection('Applications')
    const count = await collection.countDocuments({ status: 'in progress' })

    return {
      success: true,
      count
    }
  } catch (error) {
    logger.error(error, 'Failed to get in-progress application count')
    throw error
  }
}

/**
 * Get count of applications with 'new' status
 */
async function getNewCount(db, logger) {
  try {
    const collection = db.collection('Applications')
    const count = await collection.countDocuments({ status: 'new' })

    return {
      success: true,
      count
    }
  } catch (error) {
    logger.error(error, 'Failed to get new application count')
    throw error
  }
}

async function getAllApplicationsWithAppliances(db, logger) {
  try {
    const appCollection = db.collection('Applications');
    const itemCollection = db.collection('Appliance');

    // 1. Fetch all applications
    const applications = await appCollection.find({}).toArray();

    // 2. Fetch all appliances that belong to these applications
    // We get all applicationIds first to limit the appliances query
    const applicationIds = applications.map(app => app.applicationId);
    
    const allAppliances = await itemCollection
      .find({ applicationId: { $in: applicationIds } })
      .toArray();

    // 3. Stitch them together
    // We map through the applications and filter the appliances array for matches
    const combinedData = applications.map(app => {
      return {
        ...app,
        appliances: allAppliances.filter(appliance => appliance.applicationId === app.applicationId)
      };
    });

    logger.info(`Retrieved ${combinedData.length} applications with nested appliances`);
    
    return combinedData;

  } catch (error) {
    logger.error(error, 'Failed to retrieve all applications with appliances');
    throw error;
  }
}

async function getCertainApplicationsWithAppliances(db, logger, status = 'new') {
  try {
    const appCollection = db.collection('Applications');
    const itemCollection = db.collection('Appliance');

    // 1. Fetch only applications where status is 'new'
    const newApplications = await appCollection.find({ status: status }).toArray();

    // If no new applications found, return an empty array early
    if (newApplications.length === 0) {
      return [];
    }

    // 2. Extract the IDs of only the 'new' applications
    const applicationIds = newApplications.map(app => app.applicationId);
    
    // 3. Fetch all appliances linked to those specific application IDs
    const associatedAppliances = await itemCollection
      .find({ applicationId: { $in: applicationIds } })
      .toArray();

    // 4. Stitch the appliances into their respective applications
    const result = newApplications.map(app => ({
      ...app,
      appliances: associatedAppliances.filter(appliance => appliance.applicationId === app.applicationId)
    }));

    logger.info(`Found ${result.length} new applications.`);
    return result;

  } catch (error) {
    logger.error(error, 'Failed to fetch new applications');
    throw error;
  }
}

export {
  createApplication,
  getAllApplications,
  getApplicationById,
  searchApplications,
  getInProgressCount,
  getNewCount,
  getAllApplicationsWithAppliances,
  getCertainApplicationsWithAppliances

}
