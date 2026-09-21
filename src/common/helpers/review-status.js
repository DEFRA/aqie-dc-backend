// Technical review status helpers
//
// Two levels of review:
// - Item level (one appliance or fuel): every DOCUMENTATION_CHECKS and LISTING_CHECKS
//   entry must be `true` before that item can be accepted; it can be rejected at any time.
// - Application level (many items): the application is review-complete once every one
//   of its items has reached `accepted` or `rejected` - not before.
//
// Each documentation and listing check is `true` when it has four possible states:
// - true: the check has passed/completed
// - false: the check has failed
// - null: set by schema default, when no one has reviewed the check yet
// - undefined: the key is missing from the object
//Not to be confused with the `status` of a review, which is overall outcome of the review, and is either `accepted`, `rejected`, or any other possible value that is not `accepted` or `rejected` (e.g. `pending`, `in progress`, etc.)

export const DOCUMENTATION_CHECKS = [
  'testReports',
  'technicalDrawings',
  'conformityMark',
  'instructionManual'
]

export const LISTING_CHECKS = [
  'applianceDetails',
  'permittedFuels',
  'additionalConditions'
]

export const ALL_CHECKS = [...DOCUMENTATION_CHECKS, ...LISTING_CHECKS]

/* Which group a check belongs to, or null if the name is not recognised.
 */

export const getCheckGroup = (check) => {
  if (DOCUMENTATION_CHECKS.includes(check)) {
    return 'documentationChecks'
  }
  if (LISTING_CHECKS.includes(check)) {
    return 'listingChecks'
  }
  return null
}

const findOutstanding = (checks, names) =>
  names.filter((name) => checks?.[name] !== true)

//Names of the checks that have not yet passed.
export const getOutstandingChecks = (technicalReview) => [
  ...findOutstanding(
    technicalReview?.documentationChecks,
    DOCUMENTATION_CHECKS
  ),
  ...findOutstanding(technicalReview?.listingChecks, LISTING_CHECKS)
]

// Item level: an item can only be accepted once every check has passed.
export const canAcceptReview = (technicalReview) =>
  getOutstandingChecks(technicalReview).length === 0

// Application level: splits an application's items into accepted/rejected groups.
// Items still outstanding ('new'/'in_review') are excluded from both groups - see
// isApplicationReviewComplete to check whether every item has reached a final status.
// FE only needs array of accepted and rejected items; 'new'/'in_review' items are outstanding and array of them not needed
export const groupItemsByTechReviewStatus = (items = []) => ({
  accepted: items.filter((item) => item.technicalReview?.status === 'accepted'),
  rejected: items.filter((item) => item.technicalReview?.status === 'rejected')
})

// Application level: true once every item (appliance or fuel) has reached
// accepted/rejected - none are still outstanding.
const REVIEWED_STATUSES = new Set(['accepted', 'rejected'])

// True once an item's review has reached a final status (accepted/rejected).
export const isItemReviewed = (item) =>
  REVIEWED_STATUSES.has(item.technicalReview?.status)

export const isApplicationReviewComplete = (items = []) =>
  items.length > 0 && items.every(isItemReviewed)
