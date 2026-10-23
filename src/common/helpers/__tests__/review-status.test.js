import { describe, test, expect } from 'vitest'

import {
  canAcceptReview,
  getOutstandingChecks,
  DOCUMENTATION_CHECKS,
  LISTING_CHECKS,
  ALL_CHECKS,
  ALL_FUEL_CHECKS,
  getFuelCheckGroup,
  getFuelOutstandingChecks,
  canAcceptFuelReview,
  isFuelCheckRequired,
  getCheckGroup
} from '#src/common/helpers/review-status.js'

const allPassed = {
  documentationChecks: {
    testReports: true,
    technicalDrawings: true,
    conformityMark: true,
    instructionManual: true
  },
  listingChecks: {
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
      documentationChecks: {
        ...allPassed.documentationChecks,
        conformityMark: false
      }
    }

    expect(getOutstandingChecks(technicalReview)).toEqual(['conformityMark'])
  })

  test('treats an unreviewed check as outstanding', () => {
    const technicalReview = {
      ...allPassed,
      listingChecks: { ...allPassed.listingChecks, permittedFuels: null }
    }

    expect(getOutstandingChecks(technicalReview)).toEqual(['permittedFuels'])
  })

  test('reports documentation and listing checks together', () => {
    const technicalReview = {
      documentationChecks: { testReports: false },
      listingChecks: { applianceDetails: true }
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
      documentationChecks: {
        ...allPassed.documentationChecks,
        testReports: false
      }
    }

    expect(canAcceptReview(technicalReview)).toBe(false)
  })

  test('refuses when a check has not been reviewed', () => {
    expect(canAcceptReview({ ...allPassed, listingChecks: {} })).toBe(false)
  })

  test('refuses when there is no review at all', () => {
    expect(canAcceptReview(undefined)).toBe(false)
  })
})
describe('ALL_CHECKS', () => {
  test('contains every documentation and listing check', () => {
    expect(ALL_CHECKS).toHaveLength(
      DOCUMENTATION_CHECKS.length + LISTING_CHECKS.length
    )
  })

  test('has no duplicates', () => {
    expect(new Set(ALL_CHECKS).size).toBe(ALL_CHECKS.length)
  })
})

describe('getCheckGroup', () => {
  test('resolves a documentation check', () => {
    expect(getCheckGroup('technicalDrawings')).toBe('documentationChecks')
  })

  test('resolves a listing check', () => {
    expect(getCheckGroup('permittedFuels')).toBe('listingChecks')
  })

  test('resolves every known check', () => {
    ALL_CHECKS.forEach((check) => {
      expect(getCheckGroup(check)).not.toBeNull()
    })
  })

  test('returns null for an unknown check', () => {
    expect(getCheckGroup('somethingElse')).toBeNull()
  })
})

describe('fuel checks', () => {
  const rebrandPassed = {
    documentationChecks: { manufacturerLetter: true },
    listingChecks: { fuelDetails: true, fuelDescription: true }
  }
  const manufacturerPassed = {
    documentationChecks: { testResults: true },
    listingChecks: { fuelDetails: true }
  }

  test('ALL_FUEL_CHECKS lists the four fuel checks', () => {
    expect(ALL_FUEL_CHECKS).toEqual([
      'manufacturerLetter',
      'testResults',
      'fuelDetails',
      'fuelDescription'
    ])
  })

  test('getFuelCheckGroup resolves fuel checks', () => {
    expect(getFuelCheckGroup('manufacturerLetter')).toBe('documentationChecks')
    expect(getFuelCheckGroup('fuelDetails')).toBe('listingChecks')
    expect(getFuelCheckGroup('technicalDrawings')).toBeNull()
  })

  test('isFuelCheckRequired depends on supplierType', () => {
    expect(isFuelCheckRequired('manufacturerLetter', 'Rebrand')).toBe(true)
    expect(isFuelCheckRequired('fuelDescription', 'Rebrand')).toBe(true)
    expect(isFuelCheckRequired('fuelDetails', 'Rebrand')).toBe(true)
    expect(isFuelCheckRequired('testResults', 'Rebrand')).toBe(false)

    expect(isFuelCheckRequired('testResults', 'Manufacture')).toBe(true)
    expect(isFuelCheckRequired('fuelDetails', 'Manufacture')).toBe(true)
    expect(isFuelCheckRequired('manufacturerLetter', 'Manufacture')).toBe(false)
    expect(isFuelCheckRequired('fuelDescription', 'Manufacture')).toBe(false)
  })

  test('getFuelOutstandingChecks lists the checks for the supplierType', () => {
    expect(getFuelOutstandingChecks({}, 'Rebrand')).toEqual([
      'manufacturerLetter',
      'fuelDetails',
      'fuelDescription'
    ])
    expect(getFuelOutstandingChecks({}, 'Manufacture')).toEqual([
      'testResults',
      'fuelDetails'
    ])
  })

  test('getFuelOutstandingChecks treats failed checks as outstanding', () => {
    expect(
      getFuelOutstandingChecks(
        { ...rebrandPassed, listingChecks: { fuelDetails: false } },
        'Rebrand'
      )
    ).toEqual(['fuelDetails', 'fuelDescription'])
  })

  test('getFuelOutstandingChecks falls back to every check for an unknown supplierType', () => {
    expect(getFuelOutstandingChecks({}, undefined)).toEqual(ALL_FUEL_CHECKS)
  })

  test('canAcceptFuelReview requires the supplierType checks to pass', () => {
    expect(canAcceptFuelReview(rebrandPassed, 'Rebrand')).toBe(true)
    expect(canAcceptFuelReview(manufacturerPassed, 'Manufacture')).toBe(true)
    expect(canAcceptFuelReview(rebrandPassed, 'Manufacture')).toBe(false)
    expect(canAcceptFuelReview(manufacturerPassed, 'Rebrand')).toBe(false)
  })
})
