import { describe, test, expect } from 'vitest'
import { splitRepeaterJson } from '../repeater.js'

describe('splitRepeaterJson', () => {
  test('merges each repeater item with the base main fields', () => {
    const input = {
      main: { companyName: 'Acme Ltd', isUkBased: true },
      repeaters: {
        LbZxXf: [{ modelName: 'Stove A' }, { modelName: 'Stove B' }]
      }
    }

    const result = splitRepeaterJson(input)

    expect(result).toEqual([
      { companyName: 'Acme Ltd', isUkBased: true, modelName: 'Stove A' },
      { companyName: 'Acme Ltd', isUkBased: true, modelName: 'Stove B' }
    ])
  })

  test('returns an empty object when there are no repeaters', () => {
    const input = { main: { companyName: 'Acme Ltd' }, repeaters: {} }

    const result = splitRepeaterJson(input)

    expect(result).toEqual({})
  })

  test('returns an empty object when repeaters key is missing', () => {
    const input = { main: { companyName: 'Acme Ltd' } }

    const result = splitRepeaterJson(input)

    expect(result).toEqual({})
  })

  test('returns an empty object when the repeater list is not an array', () => {
    const input = {
      main: { companyName: 'Acme Ltd' },
      repeaters: { LbZxXf: 'not-an-array' }
    }

    const result = splitRepeaterJson(input)

    expect(result).toEqual({})
  })
})
