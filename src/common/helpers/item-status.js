import { getItemsCollectionName } from './application-type.js'
import { SYSTEM_ACTOR, recordAction } from './action-history.js'
import { isItemReviewed } from './review-status.js'
import {
  CERTIFICATION_FIELDS,
  CERTIFIED_STATUS,
  UNCERTIFIED_STATUSES,
  UNDECIDED_CERTIFICATION_STATUSES,
  mapCountryCertification
} from './certification.js'

// Works out the $set update for an item once its technical review has reached
// a final status (accepted/rejected) - items still mid-review are not expected here.
function resolveStatusUpdate(item, itemStatus, reviewStatus) {
  // isVisibleToPublic is left untouched for rejected items: a rejected item
  // can't be re-certified without going through review again.
  if (reviewStatus === 'rejected') {
    return { [itemStatus]: 'rejected' }
  }

  // Only reached once the application is submitted, which moves every 'new'
  // country to awaiting_decision, so 'new' or a missing record is undecided too.
  const countryCertifications = CERTIFICATION_FIELDS.map(
    (field) => mapCountryCertification(item[field]).status
  )

  const hasCertified = countryCertifications.includes(CERTIFIED_STATUS)
  const hasUncertified = countryCertifications.includes(UNCERTIFIED_STATUSES)
  const allUndecided = countryCertifications.every((status) =>
    UNDECIDED_CERTIFICATION_STATUSES.has(status)
  )

  // At least one country has certified the item - the status depends on
  // whether it has been hidden from the public. A missing isVisibleToPublic
  // counts as the default (true).
  if (hasCertified) {
    return {
      [itemStatus]: item.isVisibleToPublic !== false ? 'live' : 'hidden'
    }
  }

  // None certified, but at least one uncertified - hidden.
  // Visibility resets to the default so a later re-certification starts as live.
  if (hasUncertified) {
    return { [itemStatus]: 'hidden', isVisibleToPublic: true }
  }

  // Default: none certified, all 4 still undecided - pending.
  if (allUndecided) {
    return { [itemStatus]: 'pending', isVisibleToPublic: true }
  }

  // Shouldn't be reachable - every known certification status is covered
  // above - but fail safe rather than silently mis-stating the status.
  throw new Error(
    `Unexpected country certification combination: ${countryCertifications.join(', ')}`
  )
}

/**
 * Going live, or leaving live for hidden, is public-list history. Any other
 * change (e.g. pending to hidden, or a recalculation that changes nothing) is
 * not: the item was never on the public list, or nothing happened.
 */
const resolveVisibilityAction = (previous, next) => {
  if (next === 'live' && previous !== 'live') {
    return 'liveOnPublicList'
  }
  if (next === 'hidden' && previous === 'live') {
    return 'hiddenFromPublicList'
  }
  return null
}

/**
 * Derive an appliance/fuel's overall itemStatus from its technical review
 * outcome and per-country certification statuses, then persist it.
 * Only called once technical review has reached a final status
 * (accepted/rejected) - items still mid-review are not expected here.
 * A change onto or off the public list is recorded in the item's history.
 *
 * @param {import('mongodb').Db} db
 * @param {'appliance'|'fuel'} type
 * @param {string} itemId - applianceId or fuelId, depending on type
 * @param {{ logger?: object }} [options]
 * @returns {Promise<string>} the itemStatus value that was persisted
 */
export const calculateItemStatus = async (
  db,
  type,
  itemId,
  { logger } = {}
) => {
  if (!db) {
    throw new Error('Database instance is required')
  }
  const collectionName = getItemsCollectionName(type)
  if (!collectionName) {
    throw new Error(`Unsupported item type: ${type}`)
  }
  if (!itemId) {
    throw new Error('Item ID is required')
  }

  // The status field name is unique to this function, not a general type/collection convention.
  const itemStatus = type === 'fuel' ? 'fuelStatus' : 'applianceStatus'

  const collection = db.collection(collectionName)

  const item = await collection.findOne(
    { id: itemId },
    {
      projection: {
        'technicalReview.status': 1,
        ...Object.fromEntries(
          CERTIFICATION_FIELDS.map((field) => [`${field}.status`, 1])
        ),
        isVisibleToPublic: 1,
        [itemStatus]: 1,
        _id: 0
      }
    }
  )

  if (!item) {
    throw new Error(`Item not found: ${itemId}`)
  }

  // Only accepted or rejected reviews can be evaluated. Anything else (new,
  // in_review, missing or unexpected values) is treated as not complete.
  if (!isItemReviewed(item)) {
    throw new Error('Technical review at application stage is not complete')
  }

  const update = resolveStatusUpdate(
    item,
    itemStatus,
    item.technicalReview?.status
  )

  await collection.updateOne({ id: itemId }, { $set: update })

  const action = resolveVisibilityAction(item[itemStatus], update[itemStatus])
  if (action) {
    await recordAction(
      db,
      { itemId, itemType: type, action, actor: SYSTEM_ACTOR },
      logger
    )
  }

  return update[itemStatus]
}
