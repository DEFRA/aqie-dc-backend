import { describe, test, expect } from 'vitest'
import {
  CERTIFICATION_FIELDS,
  COUNTRY_CERTIFICATION_STATUSES,
  UNCERTIFIED_STATUS,
  findCertified,
  findLastCertifiedDate,
  mapCountryCertification
} from '#src/common/helpers/certification.js'

describe('mapCountryCertification', () => {
  const expected = (status) => ({
    status,
    firstCertifiedAt: null,
    lastCertifiedAt: null
  })

  test('reports a missing certification as awaiting_decision', () => {
    expect(mapCountryCertification(undefined)).toEqual(
      expected('awaiting_decision')
    )
  })

  test('reports new as awaiting_decision', () => {
    expect(mapCountryCertification({ status: 'new' })).toEqual(
      expected('awaiting_decision')
    )
  })

  test('keeps other statuses and drops unknown fields', () => {
    expect(
      mapCountryCertification({ status: 'certified', extra: 'x' })
    ).toEqual(expected('certified'))
  })
})

describe('CERTIFICATION_FIELDS', () => {
  test('lists the four country certification fields', () => {
    expect(CERTIFICATION_FIELDS).toEqual([
      'englandCertification',
      'scotlandCertification',
      'walesCertification',
      'nIrelandCertification'
    ])
  })
})

describe('COUNTRY_CERTIFICATION_STATUSES', () => {
  test('lists the allowed country certification statuses in one place', () => {
    expect(COUNTRY_CERTIFICATION_STATUSES).toEqual([
      'new',
      'awaiting_decision',
      'certified',
      'uncertified'
    ])
  })
})

describe('UNCERTIFIED_STATUS', () => {
  test('is the status that means not certified', () => {
    expect(UNCERTIFIED_STATUS).toBe('uncertified')
  })
})

describe('findCertified', () => {
  test('returns every certified region', () => {
    expect(
      findCertified({
        englandCertification: { status: 'certified' },
        scotlandCertification: { status: 'certified' },
        walesCertification: { status: 'certified' },
        nIrelandCertification: { status: 'certified' }
      })
    ).toEqual(['England', 'Scotland', 'Wales', 'Northern Ireland'])
  })

  test('returns only the certified regions', () => {
    expect(
      findCertified({
        englandCertification: { status: 'certified' },
        scotlandCertification: { status: 'uncertified' },
        walesCertification: { status: 'certified' },
        nIrelandCertification: { status: 'uncertified' }
      })
    ).toEqual(['England', 'Wales'])
  })

  test('returns empty when none are certified', () => {
    expect(
      findCertified({
        englandCertification: { status: 'uncertified' },
        scotlandCertification: { status: 'uncertified' },
        walesCertification: { status: 'new' },
        nIrelandCertification: { status: 'awaiting_decision' }
      })
    ).toEqual([])
  })

  test('returns empty when certifications are missing', () => {
    expect(findCertified({})).toEqual([])
  })

  test('returns empty when the item is missing', () => {
    expect(findCertified(undefined)).toEqual([])
  })
})

describe('findLastCertifiedDate', () => {
  const withDates = (...dates) =>
    Object.fromEntries(
      CERTIFICATION_FIELDS.map((field, index) => [
        field,
        { lastCertifiedAt: dates[index] }
      ])
    )

  test('returns the latest valid ISO date', () => {
    expect(
      findLastCertifiedDate(
        withDates(
          '2024-01-01T10:00:00Z',
          '2025-05-05T12:00:00Z',
          '2023-12-31T23:59:59Z',
          '2022-06-15T08:30:00Z'
        )
      )
    ).toBe('2025-05-05T12:00:00.000Z')
  })

  test('ignores invalid dates and returns the latest valid one', () => {
    expect(
      findLastCertifiedDate(
        withDates(
          'not-a-date',
          '2022-01-01T00:00:00Z',
          '',
          '2021-12-31T23:59:59Z'
        )
      )
    ).toBe('2022-01-01T00:00:00.000Z')
  })

  test('returns null when no date is valid', () => {
    expect(
      findLastCertifiedDate(withDates('foo', '', null, undefined))
    ).toBeNull()
  })

  test('returns null when certifications are missing', () => {
    expect(findLastCertifiedDate({})).toBeNull()
  })

  test('returns null when the item is missing', () => {
    expect(findLastCertifiedDate(undefined)).toBeNull()
  })
})
