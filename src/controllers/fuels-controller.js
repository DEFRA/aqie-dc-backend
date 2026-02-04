/**
 * Fuels Controller
 * Business logic for fuel-related operations
 */

/**
 * Get all fuels with pagination
 */
async function getAllFuels(db, { page = 1, limit = 20 }, logger) {
  try {
    const collection = db.collection('Fuels')
    const skip = (page - 1) * limit

    const fuels = await collection
      .find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const total = await collection.countDocuments()

    return {
      success: true,
      data: fuels,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) {
    logger.error(error, 'Failed to fetch fuels')
    throw error
  }
}

/**
 * Get fuel by fuelId
 */
async function getFuelById(db, fuelId, logger) {
  try {
    const collection = db.collection('Fuels')
    const fuel = await collection.findOne({ fuelId })

    if (!fuel) {
      return {
        success: false,
        message: 'Fuel not found',
        notFound: true
      }
    }

    return {
      success: true,
      data: fuel
    }
  } catch (error) {
    logger.error(error, 'Failed to fetch fuel')
    throw error
  }
}

/**
 * Get fuel with all users who use it
 */
async function getFuelWithUsers(db, fuelId, logger) {
  try {
    // Get fuel
    const fuel = await db.collection('Fuels').findOne({ fuelId })

    if (!fuel) {
      return {
        success: false,
        message: 'Fuel not found',
        notFound: true
      }
    }

    // Get all users who use this fuel
    const userFuels = await db
      .collection('UserFuels')
      .find({ fuelId })
      .toArray()

    const userIds = userFuels.map((uf) => uf.userId)
    const users =
      userIds.length > 0
        ? await db
            .collection('Users')
            .find({ userId: { $in: userIds } })
            .toArray()
        : []

    // Combine user data with user-fuel relationships
    const usersWithRelations = users.map((user) => {
      const userFuel = userFuels.find((uf) => uf.userId === user.userId)
      return {
        ...user,
        ...userFuel
      }
    })

    return {
      success: true,
      data: {
        fuel,
        users: usersWithRelations
      }
    }
  } catch (error) {
    logger.error(error, 'Failed to fetch fuel with users')
    throw error
  }
}

/**
 * Search fuels by name or type
 */
async function searchFuels(db, { query, page = 1, limit = 20 }, logger) {
  try {
    const collection = db.collection('Fuels')
    const skip = (page - 1) * limit

    const searchQuery = {
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { type: { $regex: query, $options: 'i' } }
      ]
    }

    const fuels = await collection
      .find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const total = await collection.countDocuments(searchQuery)

    return {
      success: true,
      data: fuels,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) {
    logger.error(error, 'Failed to search fuels')
    throw error
  }
}

export { getAllFuels, getFuelById, getFuelWithUsers, searchFuels }
