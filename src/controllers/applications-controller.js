/**
 * Applications Controller
 * Business logic for application-related operations
 */

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

export { getAllApplications, getApplicationById, searchApplications }
