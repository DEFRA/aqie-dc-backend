import Boom from '@hapi/boom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetApplianceTypes = vi.fn()

vi.mock('../../controllers/appliance-types-controller.js', () => ({
  getApplianceTypes: mockGetApplianceTypes
}))

const { getApplianceTypes } = await import('./get-appliance-types.js')

describe('GET /appliance-types route', () => {
  beforeEach(() => {
    mockGetApplianceTypes.mockReset()
  })

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

  it('should fetch appliance types and return them when isPrimary is provided', async () => {
    const mockLogger = { error: vi.fn() }
    const mockDb = { collection: vi.fn() }
    const response = { code: vi.fn().mockReturnThis() }
    const h = { response: vi.fn().mockReturnValue(response) }
    const applianceTypes = [{ value: 'Stove', isPrimary: true }]

    mockGetApplianceTypes.mockResolvedValue(applianceTypes)

    const result = await getApplianceTypes.handler(
      { query: { isPrimary: true }, db: mockDb, logger: mockLogger },
      h
    )

    expect(mockGetApplianceTypes).toHaveBeenCalledWith(mockDb, mockLogger, true)
    expect(h.response).toHaveBeenCalledWith(applianceTypes)
    expect(response.code).toHaveBeenCalledWith(200)
    expect(result).toBe(response)
  })

  it('should pass null as the isPrimary filter when the query param is omitted', async () => {
    const mockLogger = { error: vi.fn() }
    const mockDb = { collection: vi.fn() }
    const response = { code: vi.fn().mockReturnThis() }
    const h = { response: vi.fn().mockReturnValue(response) }
    const applianceTypes = [{ value: 'Stove', isPrimary: true }]

    mockGetApplianceTypes.mockResolvedValue(applianceTypes)

    await getApplianceTypes.handler(
      { query: {}, db: mockDb, logger: mockLogger },
      h
    )

    expect(mockGetApplianceTypes).toHaveBeenCalledWith(mockDb, mockLogger, null)
  })

  it('should return an internal boom error when the controller throws a generic error', async () => {
    const mockLogger = { error: vi.fn() }
    const h = { response: vi.fn() }

    mockGetApplianceTypes.mockRejectedValue(new Error('database down'))

    const result = await getApplianceTypes.handler(
      { query: {}, db: {}, logger: mockLogger },
      h
    )

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'Failed to fetch appliance types'
    )
    expect(result.isBoom).toBe(true)
    expect(result.output.statusCode).toBe(500)
  })

  it('should rethrow Boom errors without converting them', async () => {
    const mockLogger = { error: vi.fn() }
    const boomError = Boom.internal('custom boom')
    const h = { response: vi.fn() }

    mockGetApplianceTypes.mockRejectedValue(boomError)

    await expect(
      getApplianceTypes.handler({ query: {}, db: {}, logger: mockLogger }, h)
    ).rejects.toBe(boomError)

    expect(mockLogger.error).toHaveBeenCalledWith(
      boomError,
      'Failed to fetch appliance types'
    )
  })
})
