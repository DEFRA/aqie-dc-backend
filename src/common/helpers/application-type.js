// Maps an application's `type` field to its linked items (appliances or fuels) collection name.
// Single source of truth so read and write paths can't drift on unknown/missing types.

const TYPE_TO_COLLECTION = {
  appliance: 'Appliances',
  fuel: 'Fuels'
}

// Maps an application's `type` field to the field on its linked items that holds the display name.
const TYPE_TO_NAME_FIELD = {
  appliance: 'modelName',
  fuel: 'brandName'
}

// Returns undefined for an unrecognised type - callers decide how to log/handle that.
export function getItemsCollectionName(type) {
  return TYPE_TO_COLLECTION[type]
}

// Returns undefined for an unrecognised type - callers decide how to log/handle that.
export function getItemNameField(type) {
  return TYPE_TO_NAME_FIELD[type]
}

/**
 * Validate application type and return collection/field names.
 * Handles logging and returns structured result or null for invalid types.
 * @param {string} type - Application type ('appliance' or 'fuel')
 * @param {Object} logger - Logger instance for warnings
 * @returns {Object|null} { collectionName, nameField } or null if invalid
 */
export function validateApplicationType(type, logger) {
  const collectionName = getItemsCollectionName(type)
  const nameField = getItemNameField(type)

  if (!collectionName || !nameField) {
    if (logger) {
      logger.warn(`Unknown application type: ${type}`)
    }
    return null
  }

  return { collectionName, nameField }
}
