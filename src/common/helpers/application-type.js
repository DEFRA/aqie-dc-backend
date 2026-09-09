// Maps an application's `type` field to its linked items (appliances or fuels) collection name.
// Single source of truth so read and write paths can't drift on unknown/missing types.

const TYPE_TO_COLLECTION = {
  appliance: 'Appliances',
  fuel: 'Fuels'
}

export function getItemsCollectionName(type, logger) {
  const collectionName = TYPE_TO_COLLECTION[type]
  if (!collectionName) {
    logger.warn(`Unknown application type: ${type}`)
  }
  return collectionName
}
