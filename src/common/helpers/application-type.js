// Maps an application's `type` field to its linked items (appliances or fuels) collection name.
// Single source of truth so read and write paths can't drift on unknown/missing types.

const TYPE_TO_COLLECTION = {
  appliance: 'Appliances',
  fuel: 'Fuels'
}

// Returns undefined for an unrecognised type - callers decide how to log/handle that.
export function getItemsCollectionName(type) {
  return TYPE_TO_COLLECTION[type]
}
