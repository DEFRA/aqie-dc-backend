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
export const calculateItemStatus = ({
  technicalReviewStatus,
  countryCertifications,
  isVisibleToPublic
}) => {
  if (
    technicalReviewStatus === 'new' ||
    technicalReviewStatus === 'in_review'
  ) {
    throw new Error('Technical review at application stage is not complete')
  }

  if (technicalReviewStatus === 'rejected') {
    return { itemStatus: 'rejected', canTogglePublicVisibility: false }
  }

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
    return {
      itemStatus: isVisibleToPublic ? 'live' : 'hidden',
      canTogglePublicVisibility: true
    }
  }

  // None certified, but at least one revoked/rejected - hidden, no toggle.
  if (hasUncertified) {
    return { itemStatus: 'hidden', canTogglePublicVisibility: false }
  }

  // Default: none certified, all 4 still undecided - pending.
  if (allUndecided) {
    return { itemStatus: 'pending', canTogglePublicVisibility: false }
  }

  // Shouldn't be reachable - every known certification status is covered
  // above - but fail safe rather than silently mis-stating the status.
  throw new Error(
    `Unexpected country certification combination: ${countryCertifications.join(', ')}`
  )
}
