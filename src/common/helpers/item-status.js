import { getItemsCollectionName } from './application-type.js'
import {
  UNCERTIFIED_CERTIFICATION_STATUSES,
  UNDECIDED_CERTIFICATION_STATUSES
} from './certification-status.js'

/**
 * Derive an appliance/fuel's overall itemStatus (and whether its visibility
 * can be toggled) from its technical review outcome and per-country
 * certification statuses. Only called once technical review has reached a
 * final status (accepted/rejected) - items still mid-review are not
 * expected here.
 *
 * @param {import('mongodb').Db} db
 * @param {'appliance'|'fuel'} type
 * @param {string} itemId - applianceId or fuelId, depending on type
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

  if (
    item.technicalReview?.status === 'new' ||
    item.technicalReview?.status === 'in_review'
  ) {
    throw new Error('Technical review at application stage is not complete')
  }

  if (item.technicalReview?.status === 'rejected') {
    await collection.updateOne(
      { id: itemId },
      { $set: { [itemStatus]: 'rejected' } }
    )
    return
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

  // At least one country has certified the item - mindful that there is a toggle button, and the
  // status depends on whether it has been hidden from the public.
  if (hasCertified) {
    await collection.updateOne(
      { id: itemId },
      {
        $set: {
          [itemStatus]: item.isVisibleToPublic ? 'live' : 'hidden'
        }
      }
    )
    return
  }

  // None certified, but at least one revoked/rejected - hidden, mindful that there is no toggle button.
  // Visibility resets to the default so a later re-certification starts as live.
  if (hasUncertified) {
    await collection.updateOne(
      { id: itemId },
      { $set: { [itemStatus]: 'hidden', isVisibleToPublic: true } }
    )
    return
  }

  // Default: none certified, all 4 still undecided - pending.
  if (allUndecided) {
    await collection.updateOne(
      { id: itemId },
      { $set: { [itemStatus]: 'pending', isVisibleToPublic: true } }
    )
    return
  }

  // Shouldn't be reachable - every known certification status is covered
  // above - but fail safe rather than silently mis-stating the status.
  throw new Error(
    `Unexpected country certification combination: ${countryCertifications.join(', ')}`
  )
}
