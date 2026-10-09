import { describe, expect, test } from 'vitest'

import { calculateItemStatus } from '#src/common/helpers/overall-item-status.js'

describe('calculateItemStatus', () => {
  test('throws when technical review has not reached a final decision', () => {
    expect(() =>
      calculateItemStatus({
        technicalReviewStatus: 'new',
        countryCertifications: ['new'],
        isVisibleToPublic: true
      })
    ).toThrow('Technical review at application stage is not complete')

    expect(() =>
      calculateItemStatus({
        technicalReviewStatus: 'in_review',
        countryCertifications: ['awaiting_decision'],
        isVisibleToPublic: true
      })
    ).toThrow('Technical review at application stage is not complete')
  })

  test('returns live when accepted and certified countries are visible', () => {
    expect(
      calculateItemStatus({
        technicalReviewStatus: 'accepted',
        countryCertifications: ['certified'],
        isVisibleToPublic: true
      })
    ).toEqual({ itemStatus: 'live', canTogglePublicVisibility: true })
  })
})
