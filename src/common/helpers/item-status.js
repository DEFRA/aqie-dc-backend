import { getItemsCollectionName } from './application-type.js'
import { isItemReviewed } from './review-status.js'

// Country certification statuses that count as "not yet certified" when
// working out an item's public-facing status.
const UNCERTIFIED_CERTIFICATION_STATUSES = new Set(['revoked', 'rejected'])
const UNDECIDED_CERTIFICATION_STATUSES = new Set(['new', 'awaiting_decision'])

// Works out the $set update for an item once its technical review has reached
// a final status (accepted/rejected) - items still mid-review are not expected here.
function resolveStatusUpdate(item, itemStatus, reviewStatus) {
  // isVisibleToPublic is left untouched for rejected items: a rejected item
  // can't be re-certified without going through review again.
  if (reviewStatus === 'rejected') {
    return { [itemStatus]: 'rejected' }
  }

  const countryCertifications = [
    item.englandCertification?.status,
    item.scotlandCertification?.status,
    item.walesCertification?.status,
    item.nIrelandCertification?.status
  ]

  const hasCertified = countryCertifications.includes('certified')
  const hasUncertified = countryCertifications.some((status) =>
    UNCERTIFIED_CERTIFICATION_STATUSES.has(status)
  )
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

  // None certified, but at least one revoked/rejected - hidden.
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
 * Derive an appliance/fuel's overall itemStatus from its technical review
 * outcome and per-country certification statuses, then persist it.
 * Only called once technical review has reached a final status
 * (accepted/rejected) - items still mid-review are not expected here.
 *
 * @param {import('mongodb').Db} db
 * @param {'appliance'|'fuel'} type
 * @param {string} itemId - applianceId or fuelId, depending on type
 * @returns {Promise<string>} the itemStatus value that was persisted
 */
export const calculateItemStatus = async (db, type, itemId) => {
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
        'englandCertification.status': 1,
        'scotlandCertification.status': 1,
        'walesCertification.status': 1,
        'nIrelandCertification.status': 1,
        isVisibleToPublic: 1,
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

  return update[itemStatus]
}
