import { describe, test, expect } from 'vitest'
import { generateSecureId, findCertified } from './db-utils.js'

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
})
