// Country certification status helpers
//
// Once an item's technical review has reached a final status, its public-facing
// itemStatus is derived from its per-country certification statuses:
// 'new' | 'awaiting_decision' | 'certified' | 'revoked' | 'rejected'.

// Country certification statuses that count as "not yet certified" when
// working out an item's public-facing status (see calculateItemStatus below).
const UNCERTIFIED_CERTIFICATION_STATUSES = new Set(['revoked', 'rejected'])
const UNDECIDED_CERTIFICATION_STATUSES = new Set(['new', 'awaiting_decision'])

const REVIEWED_STATUSES = new Set(['accepted', 'rejected'])

// True once technical review has reached a final outcome (accepted/rejected).
export const isTechnicalReviewFinal = (technicalReviewStatus) =>
  REVIEWED_STATUSES.has(technicalReviewStatus)

// Country certification fields keyed by the name the frontend consumes.
export const CERTIFICATION_COUNTRIES = {
  england: 'englandCertification',
  scotland: 'scotlandCertification',
  wales: 'walesCertification',
  northernIreland: 'nIrelandCertification'
}

const EMPTY_CERTIFICATION = {
  status: 'new',
  firstCertifiedAt: null,
  lastCertifiedAt: null
}

// Maps a stored country certification sub-document to the shape the admin
// certification views expect, defaulting to 'new' when absent.
export const mapCountryCertification = (certification) => {
  if (!certification) {
    return { ...EMPTY_CERTIFICATION }
  }

  return {
    status: certification.status ?? EMPTY_CERTIFICATION.status,
    firstCertifiedAt: certification.firstCertifiedAt ?? null,
    lastCertifiedAt: certification.lastCertifiedAt ?? null
  }
}

// True once every country certification has moved on from the default 'new'
// status, i.e. certification has started for every country.
export const hasCertificationStarted = (countryCertifications) =>
  countryCertifications.every((status) => (status ?? 'new') !== 'new')

// ============================================================
// Item status
// ============================================================
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
