import { describe, test, expect } from 'vitest'
import { generateSecureId, findCertified, findLastUpdatedDate } from './db-utils.js'

describe('db-utils', () => {
  test('generateSecureId returns a 12-character alphanumeric string', () => {
    const id = generateSecureId()
    expect(typeof id).toBe('string')
    expect(id.length).toBe(12)
    expect(/^[a-zA-Z0-9]+$/.test(id)).toBe(true)
  })

  test('generateSecureId returns unique values', () => {
    const ids = new Set()
    for (let i = 0; i < 100; i++) {
      ids.add(generateSecureId())
    }
    expect(ids.size).toBe(100)
  })

  test('findCertified returns correct regions', () => {
    expect(
      findCertified('Certified', 'Certified', 'Certified', 'Certified')
    ).toEqual(['Wales', 'Northern Ireland', 'Scotland', 'England'])
    expect(
      findCertified('Certified', 'Uncertified', 'Certified', 'Uncertified')
    ).toEqual(['Wales', 'Scotland'])
    expect(
      findCertified('Uncertified', 'Uncertified', 'Uncertified', 'Uncertified')
    ).toEqual([])
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
      expect(findLastUpdatedDate(d1, d2, d3, d4)).toBe('2025-05-05T12:00:00.000Z')
    })

    test('returns null if all dates are invalid', () => {
      expect(findLastUpdatedDate('foo', '', null, undefined)).toBeNull()
    })

    test('ignores invalid dates and returns latest valid', () => {
      const d1 = 'not-a-date'
      const d2 = '2022-01-01T00:00:00Z'
      const d3 = ''
      const d4 = '2021-12-31T23:59:59Z'
      expect(findLastUpdatedDate(d1, d2, d3, d4)).toBe('2022-01-01T00:00:00.000Z')
    })

    test('returns null if all arguments are missing', () => {
      expect(findLastUpdatedDate()).toBeNull()
    })
  })
})
