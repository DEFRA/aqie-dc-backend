import {
  getItemNameField,
  getItemsCollectionName
} from '../common/helpers/application-type.js'

const LOGGER_REQUIRED_ERROR = 'logger is required'

const ITEM_LABELS = { appliance: 'Appliance', fuel: 'Fuel' }

// Newest first; _id breaks ties between actions recorded in the same instant.
const NEWEST_FIRST = { completedAt: -1, _id: -1 }

/**
 * An item's action history for the admin action history page.
 * Only the name of whoever completed an action is returned, not their email.
 *
 * @param {import('mongodb').Db} db
 * @param {'appliance'|'fuel'} itemType
 * @param {string} itemId
 * @param {object} logger
 */
async function getActionHistory(db, itemType, itemId, logger) {
  if (!logger) {
    throw new Error(LOGGER_REQUIRED_ERROR)
  }

  const collectionName = getItemsCollectionName(itemType)
  const nameField = getItemNameField(itemType)
  if (!collectionName || !nameField) {
    throw new Error(`Unsupported item type: ${itemType}`)
  }

  try {
    const item = await db
      .collection(collectionName)
      .findOne({ id: itemId }, { projection: { [nameField]: 1, _id: 0 } })

    if (!item) {
      return {
        success: false,
        message: `${ITEM_LABELS[itemType]} not found`,
        notFound: true
      }
    }

    const actions = await db
      .collection('Actions')
      .find({ itemId, itemType })
      .sort(NEWEST_FIRST)
      .toArray()

    return {
      success: true,
      data: {
        id: itemId,
        name: item[nameField],
        actions: actions.map((action) => ({
          id: action.id,
          description: action.description,
          completedBy: action.completedBy?.name,
          completedAt: action.completedAt
        }))
      }
    }
  } catch (error) {
    logger.error(error, 'Failed to fetch action history')
    throw error
  }
}

export { getActionHistory }
