import { describe, test, expect } from 'vitest'

import {
  canAcceptReview,
  getOutstandingChecks,
  DOCUMENTATION_CHECKS,
  LISTING_CHECKS
} from '#src/common/helpers/review-status.js'

const allPassed = {
  documentationReviewed: {
    testReports: true,
    technicalDrawings: true,
    conformityMark: true,
    instructionManual: true
  },
  checksCompleted: {
    applianceDetails: true,
    permittedFuels: true,
    additionalConditions: true
  }
}

describe('getOutstandingChecks', () => {
  test('returns nothing when every check has passed', () => {
    expect(getOutstandingChecks(allPassed)).toEqual([])
  })

  test('returns every check when the review has not started', () => {
    expect(getOutstandingChecks({})).toEqual([
      ...DOCUMENTATION_CHECKS,
      ...LISTING_CHECKS
    ])
  })

  test('treats a failed check as outstanding', () => {
    const technicalReview = {
      ...allPassed,
      documentationReviewed: {
        ...allPassed.documentationReviewed,
        conformityMark: false
      }
    }

    expect(getOutstandingChecks(technicalReview)).toEqual(['conformityMark'])
  })

  test('treats an unreviewed check as outstanding', () => {
    const technicalReview = {
      ...allPassed,
      checksCompleted: { ...allPassed.checksCompleted, permittedFuels: null }
    }

    expect(getOutstandingChecks(technicalReview)).toEqual(['permittedFuels'])
  })

  test('reports documentation and listing checks together', () => {
    const technicalReview = {
      documentationReviewed: { testReports: false },
      checksCompleted: { applianceDetails: true }
    }

    expect(getOutstandingChecks(technicalReview)).toEqual([
      'testReports',
      'technicalDrawings',
      'conformityMark',
      'instructionManual',
      'permittedFuels',
      'additionalConditions'
    ])
  })

  test('handles a missing technicalReview without throwing', () => {
    expect(getOutstandingChecks(undefined)).toHaveLength(
      DOCUMENTATION_CHECKS.length + LISTING_CHECKS.length
    )
  })
})

describe('canAcceptReview', () => {
  test('allows accepting when every check has passed', () => {
    expect(canAcceptReview(allPassed)).toBe(true)
  })

  test('refuses when a check has failed', () => {
    const technicalReview = {
      ...allPassed,
      documentationReviewed: {
        ...allPassed.documentationReviewed,
        testReports: false
      }
    }

    expect(canAcceptReview(technicalReview)).toBe(false)
  })

  test('refuses when a check has not been reviewed', () => {
    expect(canAcceptReview({ ...allPassed, checksCompleted: {} })).toBe(false)
  })

  test('refuses when there is no review at all', () => {
    expect(canAcceptReview(undefined)).toBe(false)
  })
})
