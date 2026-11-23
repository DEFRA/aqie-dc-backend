import { beforeEach, describe, test, expect, vi } from 'vitest'
import { searchPublicAppliances } from '#src/routes/appliances/search-public-appliances.js'
import { statusCodes } from '#src/common/constants/status-codes.js'
import * as applianceController from '#src/controllers/appliances-controller.js'

vi.mock('#src/controllers/appliances-controller.js', () => ({
  default: {},
  searchPublicAppliances: vi.fn()
}))

const validate = (query) =>
  searchPublicAppliances.options.validate.query.validate(query)

describe('GET /appliances/search', () => {
  let mockRequest
  let h

  beforeEach(() => {
    vi.clearAllMocks()
    h = {
      response: vi.fn((data) => ({
        code: vi.fn((code) => ({ ...data, statusCode: code }))
      }))
    }
    mockRequest = {
      query: {
        q: 'boiler',
        page: 1,
        limit: 10,
        fuelsAllowed: []
      },
      db: {},
      logger: { info: vi.fn(), error: vi.fn() }
    }
  })

  test('delegates to the controller and returns pagination', async () => {
    const pagination = { page: 1, limit: 10, total: 1, totalPages: 1 }
    applianceController.searchPublicAppliances.mockResolvedValueOnce({
      success: true,
      data: [{ id: 'A1' }],
      pagination
    })

    const result = await searchPublicAppliances.handler(mockRequest, h)

    expect(result.statusCode).toBe(statusCodes.ok)
    expect(result.pagination).toEqual(pagination)
    expect(applianceController.searchPublicAppliances).toHaveBeenCalledWith(
      mockRequest.db,
      {
        query: 'boiler',
        page: 1,
        limit: 10,
        fuelsAllowed: []
      },
      mockRequest.logger
    )
  })

  test('applies defaults and normalises single filter values to arrays', () => {
    const { value, error } = validate({ certifiedIn: 'England' })

    expect(error).toBeUndefined()
    expect(value).toMatchObject({
      page: 1,
      limit: 10,
      certifiedIn: ['england'],
      fuelsAllowed: [],
      applianceType: []
    })
  })

  test.each([
    { limit: 101 },
    { page: 0 },
    { q: 'a'.repeat(51) },
    { q: '<script>' }
  ])('rejects invalid query %j', (query) => {
    expect(validate(query).error).toBeDefined()
  })
})
