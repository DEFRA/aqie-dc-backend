/**
 * MongoDB ApplianceTypes collection helper
 * Centralizes all database operations for ApplianceTypes
 */

/**
 * Get all appliance types with optional filters
 * @param {Db} db - MongoDB database instance
 * @param {Object} filters - Query filters (e.g., { isPrimary: true })
 * @returns {Promise<Array>} Array of appliance type documents
 */
export async function getAllApplianceTypes(db, filters = {}) {
  const collection = db.collection('ApplianceTypes')
  return await collection.find(filters).toArray()
}

/**
 * Get a single appliance type by ID
 * @param {Db} db - MongoDB database instance
 * @param {ObjectId|string} id - Appliance type ID
 * @returns {Promise<Object|null>} Appliance type document or null
 */
export async function getApplianceTypeById(db, id) {
  const collection = db.collection('ApplianceTypes')
  return await collection.findOne({ _id: id })
}

/**
 * Get appliance types filtered by isPrimary flag
 * @param {Db} db - MongoDB database instance
 * @param {boolean} isPrimary - Filter by isPrimary flag
 * @returns {Promise<Array>} Array of appliance type documents
 */
export async function getApplianceTypesByPrimary(db, isPrimary) {
  const collection = db.collection('ApplianceTypes')
  return await collection.find({ isPrimary }).toArray()
}

/**
 * Create a new appliance type
 * @param {Db} db - MongoDB database instance
 * @param {Object} data - Appliance type data (name, isPrimary, etc.)
 * @returns {Promise<Object>} Created appliance type with _id
 */
export async function createApplianceType(db, data) {
  const collection = db.collection('ApplianceTypes')
  const now = new Date()

  const document = {
    ...data,
    createdAt: now,
    updatedAt: now
  }

  const result = await collection.insertOne(document)
  return { _id: result.insertedId, ...document }
}

/**
 * Update an appliance type
 * @param {Db} db - MongoDB database instance
 * @param {ObjectId|string} id - Appliance type ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated appliance type
 */
export async function updateApplianceType(db, id, updates) {
  const collection = db.collection('ApplianceTypes')
  const now = new Date()

  const result = await collection.findOneAndUpdate(
    { _id: id },
    {
      $set: {
        ...updates,
        updatedAt: now
      }
    },
    { returnDocument: 'after' }
  )

  return result.value
}

/**
 * Delete an appliance type
 * @param {Db} db - MongoDB database instance
 * @param {ObjectId|string} id - Appliance type ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
export async function deleteApplianceType(db, id) {
  const collection = db.collection('ApplianceTypes')
  const result = await collection.deleteOne({ _id: id })
  return result.deletedCount > 0
}
