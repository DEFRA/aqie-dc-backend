/**
 * Users Controller
 * Business logic for user-related operations
 */

/**
 * Get all users with pagination
 */
async function getAllUsers(db, { page = 1, limit = 20 }, logger) {
  try {
    const collection = db.collection('users')
    const skip = (page - 1) * limit

    // Get users with pagination
    const users = await collection
      .find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    // Get total count
    const total = await collection.countDocuments()

    return {
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) {
    logger.error(error, 'Failed to fetch users')
    throw error
  }
}

/**
 * Get user by userId
 */
async function getUserById(db, userId, logger) {
  try {
    const collection = db.collection('users')
    const user = await collection.findOne({ userId })

    if (!user) {
      return {
        success: false,
        message: 'User not found',
        notFound: true
      }
    }

    return {
      success: true,
      data: user
    }
  } catch (error) {
    logger.error(error, 'Failed to fetch user')
    throw error
  }
}

/**
 * Get user with their appliances and fuels relationships
 */
async function getUserWithRelations(db, userId, logger) {
  try {
    // Get user
    const user = await db.collection('users').findOne({ userId })

    if (!user) {
      return {
        success: false,
        message: 'User not found',
        notFound: true
      }
    }

    // Get user's appliances
    const userAppliances = await db
      .collection('userAppliances')
      .find({ userId })
      .toArray()

    const applianceIds = userAppliances.map((ua) => ua.applianceId)
    const appliances =
      applianceIds.length > 0
        ? await db
            .collection('appliances')
            .find({ applianceId: { $in: applianceIds } })
            .toArray()
        : []

    // Get user's fuels
    const userFuels = await db
      .collection('userFuels')
      .find({ userId })
      .toArray()

    const fuelIds = userFuels.map((uf) => uf.fuelId)
    const fuels =
      fuelIds.length > 0
        ? await db
            .collection('fuels')
            .find({ fuelId: { $in: fuelIds } })
            .toArray()
        : []

    // Combine appliance data with user-appliance relationships
    const appliancesWithRelations = appliances.map((appliance) => {
      const userAppliance = userAppliances.find(
        (ua) => ua.applianceId === appliance.applianceId
      )
      return {
        ...appliance,
        ...userAppliance
      }
    })

    // Combine fuel data with user-fuel relationships
    const fuelsWithRelations = fuels.map((fuel) => {
      const userFuel = userFuels.find((uf) => uf.fuelId === fuel.fuelId)
      return {
        ...fuel,
        ...userFuel
      }
    })

    return {
      success: true,
      data: {
        user,
        appliances: appliancesWithRelations,
        fuels: fuelsWithRelations
      }
    }
  } catch (error) {
    logger.error(error, 'Failed to fetch user with relations')
    throw error
  }
}

/**
 * Search users by name or email
 */
async function searchUsers(db, { query, page = 1, limit = 20 }, logger) {
  try {
    const collection = db.collection('users')
    const skip = (page - 1) * limit

    // Search in name and email fields
    const searchQuery = {
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }

    const users = await collection
      .find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const total = await collection.countDocuments(searchQuery)

    return {
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) {
    logger.error(error, 'Failed to search users')
    throw error
  }
}

export { getAllUsers, getUserById, getUserWithRelations, searchUsers }
