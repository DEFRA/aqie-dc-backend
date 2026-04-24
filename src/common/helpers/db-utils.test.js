import { describe, test, expect } from 'vitest'
import {
  generateSecureId,
  findCertified,
  findLastUpdatedDate,
  getFullAddress
} from './db-utils.js'

const ADDRESS_LINE_1 = '123 Main St'
const ADDRESS_LINE_2 = 'Apt 4'
const ADDRESS_CITY = 'London'
const ADDRESS_COUNTY = 'Greater London'
const ADDRESS_POSTCODE = 'SW1A 1AA'
const SECURE_ID_LENGTH = 12

describe('db-utils constants', () => {
  test('SECURE_ID_LENGTH constant is used for generateSecureId length', () => {
    // This test verifies the constant is properly used by checking multiple IDs
    for (let i = 0; i < 10; i++) {
      const id = generateSecureId()
      expect(id.length).toBe(SECURE_ID_LENGTH)
    }
  })
})

describe('getFullAddress', () => {
  test('returns UK address lines array', () => {
    const item = {
      isUkBased: true,
      companyAddressLine1: ADDRESS_LINE_1,
      companyAddressLine2: ADDRESS_LINE_2,
      companyAddressCity: ADDRESS_CITY,
      companyAddressCounty: ADDRESS_COUNTY,
      companyAddressPostcode: ADDRESS_POSTCODE
    }
    expect(getFullAddress(item)).toEqual([
      ADDRESS_LINE_1,
      ADDRESS_LINE_2,
      ADDRESS_CITY,
      ADDRESS_COUNTY,
      ADDRESS_POSTCODE
    ])
  })

  test('returns non-UK address as single-element array', () => {
    const item = {
      isUkBased: false,
      companyAddress: '456 Rue de Paris, Paris, France'
    }
    expect(getFullAddress(item)).toEqual(['456 Rue de Paris, Paris, France'])
  })

  test('filters out empty or null address lines', () => {
    const item = {
      isUkBased: true,
      companyAddressLine1: ADDRESS_LINE_1,
      companyAddressLine2: '',
      companyAddressCity: null,
      companyAddressCounty: ADDRESS_COUNTY,
      companyAddressPostcode: ADDRESS_POSTCODE
    }
    expect(getFullAddress(item)).toEqual([
      ADDRESS_LINE_1,
      ADDRESS_COUNTY,
      ADDRESS_POSTCODE
    ])
  })
})

describe('db-utils', () => {
  test('generateSecureId returns a 12-character alphanumeric string', () => {
    const id = generateSecureId()
    expect(typeof id).toBe('string')
    expect(id.length).toBe(SECURE_ID_LENGTH)
    expect(/^[a-zA-Z0-9]+$/.test(id)).toBe(true)
  })

  test('generateSecureId removes all non-alphanumeric characters', () => {
    // Generate many IDs to ensure replaceAll is properly removing all special characters
    for (let i = 0; i < 50; i++) {
      const id = generateSecureId()
      // Should only contain letters and numbers
      expect(/^[a-zA-Z0-9]+$/.test(id)).toBe(true)
      // Should not contain any special characters, slashes, or plus signs from base64
      expect(/[+/=_-]/.test(id)).toBe(false)
    }
  })

  test('generateSecureId returns unique values', () => {
    const ids = new Set()
    for (let i = 0; i < 100; i++) {
      ids.add(generateSecureId())
    }
    expect(ids.size).toBe(100)
  })

  test('findCertified returns correct regions', () => {
    // All certified
    expect(
      findCertified('Certified', 'Certified', 'Certified', 'Certified')
    ).toEqual(['England', 'Scotland', 'Wales', 'Northern Ireland'])
    // England and Wales only
    expect(
      findCertified('Certified', 'Uncertified', 'Certified', 'Uncertified')
    ).toEqual(['England', 'Wales'])
    // None certified
    expect(
      findCertified('Uncertified', 'Uncertified', 'Uncertified', 'Uncertified')
    ).toEqual([])
    // All undefined
    expect(findCertified(undefined, undefined, undefined, undefined)).toEqual(
      []
    )
  })

  describe('findLastUpdatedDate', () => {
    test('returns the latest valid ISO date', () => {
      const d1 = '2024-01-01T10:00:00Z'
      const d2 = '2025-05-05T12:00:00Z'
      const d3 = '2023-12-31T23:59:59Z'
      const d4 = '2022-06-15T08:30:00Z'
      expect(findLastUpdatedDate(d1, d2, d3, d4)).toBe(
        '2025-05-05T12:00:00.000Z'
      )
    })

    test('returns null if all dates are invalid', () => {
      expect(findLastUpdatedDate('foo', '', null, undefined)).toBeNull()
    })

    test('ignores invalid dates and returns latest valid', () => {
      const d1 = 'not-a-date'
      const d2 = '2022-01-01T00:00:00Z'
      const d3 = ''
      const d4 = '2021-12-31T23:59:59Z'
      expect(findLastUpdatedDate(d1, d2, d3, d4)).toBe(
        '2022-01-01T00:00:00.000Z'
      )
    })

    test('returns null if all arguments are missing', () => {
      expect(findLastUpdatedDate()).toBeNull()
    })
  })
})
