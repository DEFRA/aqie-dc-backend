// Technical review status helpers
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

// An appliance can only be accepted once every check has passed.
export const canAcceptReview = (technicalReview) =>
  getOutstandingChecks(technicalReview).length === 0
