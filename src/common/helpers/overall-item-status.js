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
 * @param {object} params
 * @param {'accepted'|'rejected'} params.technicalReviewStatus
 * @param {string[]} params.countryCertifications - One status per country
 *   (England, Scotland, Wales, Northern Ireland), e.g. 'certified'.
 * @param {boolean} params.isVisibleToPublic - Only relevant once at least
 *   one country is certified.
 * @returns {{ itemStatus: 'rejected'|'pending'|'hidden'|'live', canTogglePublicVisibility: boolean }}
 */
export const calculateItemStatus = async (db, applianceId) => {
  if (!db) {
    throw new Error('Database instance is required')
  }
  if (!applianceId) {
    throw new Error('Appliance ID is required')
  }

  const appliances = db.collection('Appliances')

  const appliance = await appliances.findOne(
    { id: applianceId },
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
    appliance.technicalReview?.status === 'new' ||
    appliance.technicalReview?.status === 'in_review'
  ) {
    throw new Error('Technical review at application stage is not complete')
  }

  if (appliance.technicalReview?.status === 'rejected') {
    await appliances.updateOne(
      { id: applianceId },
      { $set: { applianceStatus: 'rejected' } }
    )
    return
  }

  const countryCertifications = [
    appliance.englandCertification?.status,
    appliance.scotlandCertification?.status,
    appliance.walesCertification?.status,
    appliance.nIrelandCertification?.status
  ]

  const hasCertified = countryCertifications.includes('certified')
  const hasUncertified = countryCertifications.some((status) =>
    UNCERTIFIED_CERTIFICATION_STATUSES.has(status)
  )
  const allUndecided = countryCertifications.every((status) =>
    UNDECIDED_CERTIFICATION_STATUSES.has(status)
  )

  // At least one country has certified the item - show the toggle, and the
  // status depends on whether it has been hidden from the public.
  if (hasCertified) {
    await appliances.updateOne(
      { id: applianceId },
      {
        $set: {
          applianceStatus: appliance.isVisibleToPublic ? 'live' : 'hidden'
        }
      }
    )
    return
  }

  // None certified, but at least one revoked/rejected - hidden, no toggle.
  // Visibility resets to the default so a later re-certification starts as live.
  if (hasUncertified) {
    await appliances.updateOne(
      { id: applianceId },
      { $set: { applianceStatus: 'hidden', isVisibleToPublic: true } }
    )
    return
  }

  // Default: none certified, all 4 still undecided - pending.
  if (allUndecided) {
    await appliances.updateOne(
      { id: applianceId },
      { $set: { applianceStatus: 'pending', isVisibleToPublic: true } }
    )
    return
  }

  // Shouldn't be reachable - every known certification status is covered
  // above - but fail safe rather than silently mis-stating the status.
  throw new Error(
    `Unexpected country certification combination: ${countryCertifications.join(', ')}`
  )
}
