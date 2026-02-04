/**
 * Appliances Controller
 * Business logic for appliance-related operations
 */

/**
 * Get all appliances with pagination
 */
async function getAllAppliances(db, { page = 1, limit = 20 }, logger) {
  try {
    const collection = db.collection('Appliances')
    const skip = (page - 1) * limit

    const appliances = await collection
      .find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const total = await collection.countDocuments()

    return {
      success: true,
      data: appliances,
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
 * Get appliance by applianceId
 */
async function getApplianceById(db, applianceId, logger) {
  try {
    const collection = db.collection('Appliances')
    const appliance = await collection.findOne({ applianceId })

    if (!appliance) {
      return {
        success: false,
        message: 'Appliance not found',
        notFound: true
      }
    }

    return {
      success: true,
      data: appliance
    }
  } catch (error) {
    logger.error(error, 'Failed to fetch appliance')
    throw error
  }
}

/**
 * Get appliance with all users who have it
 */
async function getApplianceWithUsers(db, applianceId, logger) {
  try {
    // Get appliance
    const appliance = await db.collection('Appliances').findOne({ applianceId })

    if (!appliance) {
      return {
        success: false,
        message: 'Appliance not found',
        notFound: true
      }
    }

    // Get all users who have this appliance
    const userAppliances = await db
      .collection('UserAppliances')
      .find({ applianceId })
      .toArray()

    const userIds = userAppliances.map((ua) => ua.userId)
    const users =
      userIds.length > 0
        ? await db
            .collection('Users')
            .find({ userId: { $in: userIds } })
            .toArray()
        : []

    // Combine user data with user-appliance relationships
    const usersWithRelations = users.map((user) => {
      const userAppliance = userAppliances.find(
        (ua) => ua.userId === user.userId
      )
      return {
        ...user,
        ...userAppliance
      }
    })

    return {
      success: true,
      data: {
        appliance,
        users: usersWithRelations
      }
    }
  } catch (error) {
    logger.error(error, 'Failed to fetch appliance with users')
    throw error
  }
}

/**
 * Search appliances by name or type
 */
async function searchAppliances(db, { query, page = 1, limit = 20 }, logger) {
  try {
    const collection = db.collection('Appliances')
    const skip = (page - 1) * limit

    const searchQuery = {
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { type: { $regex: query, $options: 'i' } }
      ]
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
      data: appliances,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) {
    logger.error(error, 'Failed to search appliances')
    throw error
  }
}

export {
  getAllAppliances,
  getApplianceById,
  getApplianceWithUsers,
  searchAppliances
}
