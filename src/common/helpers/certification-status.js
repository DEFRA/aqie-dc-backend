// Country certification statuses that count as "not yet certified" when
// working out an item's public-facing status (see calculateItemStatus below).
export const UNCERTIFIED_CERTIFICATION_STATUSES = new Set([
  'revoked',
  'rejected'
])
export const UNDECIDED_CERTIFICATION_STATUSES = new Set([
  'new',
  'awaiting_decision'
])