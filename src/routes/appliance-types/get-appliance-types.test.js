import { describe, it, expect } from 'vitest'
import { getApplianceTypes } from './get-appliance-types.js'

describe('GET /appliance-types route', () => {
  it('should have correct route configuration', () => {
    expect(getApplianceTypes.method).toBe('GET')
    expect(getApplianceTypes.path).toBe('/appliance-types')
    expect(getApplianceTypes.options.description).toBe(
      'Fetch available appliance types, optionally filtered by isPrimary'
    )
  })

  it('should have correct route tags', () => {
    expect(getApplianceTypes.options.tags).toContain('api')
    expect(getApplianceTypes.options.tags).toContain('read')
  })

  it('should have isPrimary validation configured', () => {
    const { query } = getApplianceTypes.options.validate
    expect(query).toBeDefined()

    // Validate that it accepts valid boolean values
    const resultTrue = query.validate({ isPrimary: true })
    const resultFalse = query.validate({ isPrimary: false })

    expect(resultTrue.error).toBeUndefined()
    expect(resultFalse.error).toBeUndefined()
    expect(resultTrue.value.isPrimary).toBe(true)
    expect(resultFalse.value.isPrimary).toBe(false)
  })

  it('should allow empty query parameters', () => {
    const { query } = getApplianceTypes.options.validate
    const result = query.validate({})

    expect(result.error).toBeUndefined()
    expect(result.value).toEqual({})
  })

  it('should have a handler function', () => {
    expect(getApplianceTypes.handler).toBeDefined()
    expect(typeof getApplianceTypes.handler).toBe('function')
  })
})
