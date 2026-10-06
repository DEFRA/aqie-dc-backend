import { describe, test, expect } from 'vitest'

import {
  calculateItemStatus,
  isTechnicalReviewFinal,
  hasCertificationStarted
} from '#src/common/helpers/certification-status.js'

describe('calculateItemStatus', () => {
  test('is rejected when the technical review was rejected, regardless of certifications', () => {
    expect(
      calculateItemStatus({
        technicalReviewStatus: 'rejected',
        countryCertifications: [
          'certified',
          'awaiting_decision',
          'new',
          'revoked'
        ],
        isVisibleToPublic: true
      })
    ).toEqual({ itemStatus: 'rejected', canTogglePublicVisibility: false })
  })

  test('is live when at least one country is certified and visible to the public', () => {
    expect(
      calculateItemStatus({
        technicalReviewStatus: 'accepted',
        countryCertifications: [
          'certified',
          'awaiting_decision',
          'awaiting_decision',
          'awaiting_decision'
        ],
        isVisibleToPublic: true
      })
    ).toEqual({ itemStatus: 'live', canTogglePublicVisibility: true })
  })

  test('is hidden when at least one country is certified but visibility is switched off', () => {
    expect(
      calculateItemStatus({
        technicalReviewStatus: 'accepted',
        countryCertifications: ['certified', 'revoked', 'rejected', 'new'],
        isVisibleToPublic: false
      })
    ).toEqual({ itemStatus: 'hidden', canTogglePublicVisibility: true })
  })

  test('is hidden with no toggle when none are certified but at least one is revoked/rejected', () => {
    expect(
      calculateItemStatus({
        technicalReviewStatus: 'accepted',
        countryCertifications: [
          'revoked',
          'awaiting_decision',
          'new',
          'awaiting_decision'
        ],
        isVisibleToPublic: true
      })
    ).toEqual({ itemStatus: 'hidden', canTogglePublicVisibility: false })
  })

  test('is pending when every country is still awaiting a decision', () => {
    expect(
      calculateItemStatus({
        technicalReviewStatus: 'accepted',
        countryCertifications: [
          'awaiting_decision',
          'new',
          'new',
          'awaiting_decision'
        ],
        isVisibleToPublic: true
      })
    ).toEqual({ itemStatus: 'pending', canTogglePublicVisibility: false })
  })

  test('throws on an unrecognised certification status', () => {
    expect(() =>
      calculateItemStatus({
        technicalReviewStatus: 'accepted',
        countryCertifications: ['bogus', 'new', 'new', 'new'],
        isVisibleToPublic: true
      })
    ).toThrow('Unexpected country certification combination')
  })
})

describe('isTechnicalReviewFinal', () => {
  test('is true for accepted and rejected', () => {
    expect(isTechnicalReviewFinal('accepted')).toBe(true)
    expect(isTechnicalReviewFinal('rejected')).toBe(true)
  })

  test('is false for new, in_review and missing statuses', () => {
    expect(isTechnicalReviewFinal('new')).toBe(false)
    expect(isTechnicalReviewFinal('in_review')).toBe(false)
    expect(isTechnicalReviewFinal(undefined)).toBe(false)
  })
})

describe('hasCertificationStarted', () => {
  test('is true once every country has moved on from new', () => {
    expect(
      hasCertificationStarted([
        'awaiting_decision',
        'certified',
        'revoked',
        'rejected'
      ])
    ).toBe(true)
  })

  test('is false when at least one country is still new', () => {
    expect(
      hasCertificationStarted([
        'awaiting_decision',
        'new',
        'certified',
        'certified'
      ])
    ).toBe(false)
  })

  test('treats a missing status as new', () => {
    expect(
      hasCertificationStarted([
        'awaiting_decision',
        undefined,
        'certified',
        'certified'
      ])
    ).toBe(false)
  })
})
